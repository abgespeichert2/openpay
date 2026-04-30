import { randomBytes } from "crypto";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AppError, getErrorMessage } from "@/lib/http";
import { getRedis } from "@/lib/redis";
import {
  createPaymentWallet,
  getPaymentBalanceLamports,
  getSettlementSignatureState,
  movePaymentBalanceToRecipient,
  SolanaSettlementPendingError,
} from "@/lib/solana";

const PAYMENT_TTL_SECONDS = 48 * 60 * 60;
const SETTLEMENT_LOCK_TTL_SECONDS = 30;
const PAYMENT_IDENTIFIER_BYTES = 6;
const PAYMENT_IDENTIFIER_ATTEMPTS = 5;
const PAYMENT_KEY_PREFIX = "openpay:payment";
const PAYMENT_LOCK_PREFIX = "openpay:payment-lock";
const PAYMENT_NETWORKS = ["dev", "test", "main"] as const;

export type PaymentNetwork = "dev" | "test" | "main";

export interface PaymentAmount {
  solana: number;
  notional: number;
  currency: string;
}

export interface PaymentMeta {
  name: string;
  description: string;
  redirect?: {
    finished?: string;
    cancelled?: string;
  };
}

export interface PaymentStatus {
  created: string | null;
  paid: string | null;
  moved: string | null;
}

export interface StoredPayment {
  version: 1;
  identifier: string;
  address: string;
  recipient: string;
  network: PaymentNetwork;
  meta: PaymentMeta;
  amount: PaymentAmount;
  expectedLamports: number;
  wallet: {
    publicKey: string;
    secretKey: number[];
  };
  status: PaymentStatus;
  settlement?: {
    signature?: string;
    balanceLamports?: number;
    movedLamports?: number;
    feeLamports?: number;
    lastError?: string;
    lastChecked?: string;
  };
}

export interface PublicPaymentStatusResponse {
  identifier: string;
  address: string;
  network: PaymentNetwork;
  meta: PaymentMeta;
  balance: {
    lamports: number;
    solana: number;
  };
  status: PaymentStatus;
  payment: {
    amount: PaymentAmount;
  };
}

function nowUtcIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function paymentKey(identifier: string): string {
  return `${PAYMENT_KEY_PREFIX}:${identifier}`;
}

function settlementLockKey(identifier: string): string {
  return `${PAYMENT_LOCK_PREFIX}:${identifier}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
  label: string,
  maxLength: number,
): string {
  const value = record[key];

  if (typeof value !== "string") {
    throw new AppError("INVALID_REQUEST", `${label} must be a string.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new AppError("INVALID_REQUEST", `${label} is required.`);
  }

  if (trimmed.length > maxLength) {
    throw new AppError(
      "INVALID_REQUEST",
      `${label} must be at most ${maxLength} characters.`,
    );
  }

  return trimmed;
}

function readNumber(
  record: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError("INVALID_REQUEST", `${label} must be a number.`);
  }

  return value;
}

function readOptionalRedirect(value: unknown): PaymentMeta["redirect"] {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new AppError("INVALID_REQUEST", "meta.redirect must be an object.");
  }

  const redirect: PaymentMeta["redirect"] = {};

  for (const key of ["finished", "cancelled"] as const) {
    const target = value[key];

    if (target === undefined) {
      continue;
    }

    if (typeof target !== "string" || !target.trim()) {
      throw new AppError(
        "INVALID_REQUEST",
        `meta.redirect.${key} must be a URL string.`,
      );
    }

    let url: URL;

    try {
      url = new URL(target.trim());
    } catch {
      throw new AppError(
        "INVALID_REQUEST",
        `meta.redirect.${key} must be a valid URL.`,
      );
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new AppError(
        "INVALID_REQUEST",
        `meta.redirect.${key} must use http or https.`,
      );
    }

    redirect[key] = url.toString();
  }

  return Object.keys(redirect).length > 0 ? redirect : undefined;
}

function parseCreatePaymentRequest(body: unknown) {
  if (!isRecord(body)) {
    throw new AppError("INVALID_REQUEST", "Request body must be an object.");
  }

  const recipientValue = body.receipient ?? body.recipient;
  const network = body.network;

  if (
    typeof network !== "string" ||
    !PAYMENT_NETWORKS.includes(network as PaymentNetwork)
  ) {
    throw new AppError(
      "INVALID_REQUEST",
      "network must be one of dev, test, main.",
    );
  }

  if (typeof recipientValue !== "string") {
    throw new AppError(
      "INVALID_REQUEST",
      "receipient must be a valid Solana public key.",
    );
  }

  let recipient: string;

  try {
    recipient = new PublicKey(recipientValue.trim()).toBase58();
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      "receipient must be a valid Solana public key.",
    );
  }

  if (!isRecord(body.meta)) {
    throw new AppError("INVALID_REQUEST", "meta is required.");
  }

  if (!isRecord(body.amount)) {
    throw new AppError("INVALID_REQUEST", "amount is required.");
  }

  const solana = readNumber(body.amount, "solana", "amount.solana");
  const notional = readNumber(body.amount, "notional", "amount.notional");
  const currency = readString(body.amount, "currency", "amount.currency", 16);

  if (solana <= 0) {
    throw new AppError("INVALID_REQUEST", "amount.solana must be positive.");
  }

  if (notional < 0) {
    throw new AppError(
      "INVALID_REQUEST",
      "amount.notional must not be negative.",
    );
  }

  const expectedLamports = Math.round(solana * LAMPORTS_PER_SOL);

  if (!Number.isSafeInteger(expectedLamports) || expectedLamports <= 0) {
    throw new AppError(
      "INVALID_REQUEST",
      "amount.solana is outside the supported range.",
    );
  }

  return {
    recipient,
    network: network as PaymentNetwork,
    meta: {
      name: readString(body.meta, "name", "meta.name", 160),
      description: readString(
        body.meta,
        "description",
        "meta.description",
        1_000,
      ),
      redirect: readOptionalRedirect(body.meta.redirect),
    },
    amount: {
      solana,
      notional,
      currency,
    },
    expectedLamports,
  };
}

function parseStoredPayment(raw: string): StoredPayment {
  try {
    const payment = JSON.parse(raw) as StoredPayment;

    if (!payment || payment.version !== 1 || !payment.identifier) {
      throw new Error("Invalid payment payload.");
    }

    return payment;
  } catch (error) {
    console.error("Invalid payment record in Redis", error);

    throw new AppError(
      "PAYMENT_RECORD_INVALID",
      "Payment record is invalid.",
    );
  }
}

async function savePayment(payment: StoredPayment): Promise<void> {
  const redis = await getRedis();

  await redis.set(paymentKey(payment.identifier), JSON.stringify(payment), {
    expiration: {
      type: "EX",
      value: PAYMENT_TTL_SECONDS,
    },
  });
}

async function findPayment(identifier: string): Promise<StoredPayment | null> {
  const redis = await getRedis();
  const raw = await redis.get(paymentKey(identifier));

  return raw ? parseStoredPayment(raw) : null;
}

export async function paymentExists(identifier: string): Promise<boolean> {
  const redis = await getRedis();

  return (await redis.exists(paymentKey(identifier))) === 1;
}

async function acquireSettlementLock(identifier: string): Promise<string | null> {
  const redis = await getRedis();
  const token = randomBytes(16).toString("hex");
  const result = await redis.set(settlementLockKey(identifier), token, {
    condition: "NX",
    expiration: {
      type: "EX",
      value: SETTLEMENT_LOCK_TTL_SECONDS,
    },
  });

  return result === "OK" ? token : null;
}

async function releaseSettlementLock(
  identifier: string,
  token: string,
): Promise<void> {
  const redis = await getRedis();

  await redis.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    {
      keys: [settlementLockKey(identifier)],
      arguments: [token],
    },
  );
}

async function createPaymentIdentifier(): Promise<string> {
  for (let attempt = 0; attempt < PAYMENT_IDENTIFIER_ATTEMPTS; attempt += 1) {
    const identifier = randomBytes(PAYMENT_IDENTIFIER_BYTES).toString("hex");
    const existingPayment = await findPayment(identifier);

    if (!existingPayment) {
      return identifier;
    }
  }

  throw new AppError(
    "PAYMENT_IDENTIFIER_COLLISION",
    "Could not allocate a payment identifier.",
  );
}

export function toCreatePaymentResponse(payment: StoredPayment) {
  return {
    identifier: payment.identifier,
    address: payment.address,
    payment: {
      amount: payment.amount,
    },
  };
}

export function toPublicStatusResponse(
  payment: StoredPayment,
): PublicPaymentStatusResponse {
  const balanceLamports = payment.settlement?.balanceLamports ?? 0;

  return {
    identifier: payment.identifier,
    address: payment.address,
    network: payment.network,
    meta: payment.meta,
    balance: {
      lamports: balanceLamports,
      solana: balanceLamports / LAMPORTS_PER_SOL,
    },
    status: payment.status,
    payment: {
      amount: payment.amount,
    },
  };
}

export function toReceiptResponse(payment: StoredPayment) {
  return {
    identifier: payment.identifier,
    status: payment.status,
    meta: payment.meta,
    payment: {
      amount: payment.amount,
    },
  };
}

export async function createPaymentOrder(body: unknown): Promise<StoredPayment> {
  const input = parseCreatePaymentRequest(body);
  const identifier = await createPaymentIdentifier();
  const wallet = createPaymentWallet();
  const createdAt = nowUtcIso();

  const payment: StoredPayment = {
    version: 1,
    identifier,
    address: wallet.address,
    recipient: input.recipient,
    network: input.network,
    meta: input.meta,
    amount: input.amount,
    expectedLamports: input.expectedLamports,
    wallet: {
      publicKey: wallet.address,
      secretKey: wallet.secretKey,
    },
    status: {
      created: createdAt,
      paid: null,
      moved: null,
    },
    settlement: {
      balanceLamports: 0,
      lastChecked: createdAt,
    },
  };

  await savePayment(payment);

  return payment;
}

async function markPaidIfFunded(payment: StoredPayment): Promise<StoredPayment> {
  if (payment.status.paid) {
    return payment;
  }

  const balanceLamports = await getPaymentBalanceLamports(payment);
  const checkedAt = nowUtcIso();
  const updatedPayment: StoredPayment = {
    ...payment,
    status: {
      ...payment.status,
      paid: balanceLamports >= payment.expectedLamports ? checkedAt : null,
    },
    settlement: {
      ...payment.settlement,
      balanceLamports,
      lastChecked: checkedAt,
      lastError: undefined,
    },
  };

  await savePayment(updatedPayment);

  return updatedPayment;
}

async function resolvePendingSettlement(
  payment: StoredPayment,
): Promise<StoredPayment> {
  const signature = payment.settlement?.signature;

  if (!signature || payment.status.moved) {
    return payment;
  }

  const checkedAt = nowUtcIso();
  const signatureState = await getSettlementSignatureState(payment, signature);

  if (signatureState.state === "confirmed") {
    const movedPayment: StoredPayment = {
      ...payment,
      status: {
        ...payment.status,
        moved: checkedAt,
      },
      settlement: {
        ...payment.settlement,
        lastChecked: checkedAt,
        lastError: undefined,
      },
    };

    await savePayment(movedPayment);

    return movedPayment;
  }

  if (signatureState.state === "failed") {
    const retryableSettlement = {
      ...payment.settlement,
    };

    delete retryableSettlement.signature;

    const retryablePayment: StoredPayment = {
      ...payment,
      settlement: {
        ...retryableSettlement,
        lastChecked: checkedAt,
        lastError: signatureState.error ?? "Settlement transaction failed.",
      },
    };

    await savePayment(retryablePayment);

    return retryablePayment;
  }

  const pendingPayment: StoredPayment = {
    ...payment,
    settlement: {
      ...payment.settlement,
      lastChecked: checkedAt,
    },
  };

  await savePayment(pendingPayment);

  return pendingPayment;
}

async function savePendingSettlementError(
  payment: StoredPayment,
  error: SolanaSettlementPendingError,
): Promise<StoredPayment> {
  const checkedAt = nowUtcIso();
  const updatedPayment: StoredPayment = {
    ...payment,
    settlement: {
      ...payment.settlement,
      signature: error.signature,
      balanceLamports: error.balanceLamports,
      movedLamports: error.movedLamports,
      feeLamports: error.feeLamports,
      lastChecked: checkedAt,
      lastError: error.message,
    },
  };

  await savePayment(updatedPayment);

  return updatedPayment;
}

async function settlePaidPayment(payment: StoredPayment): Promise<StoredPayment> {
  if (!payment.status.paid || payment.status.moved) {
    return payment;
  }

  const lockToken = await acquireSettlementLock(payment.identifier);

  if (!lockToken) {
    return payment;
  }

  try {
    const latestPayment = await findPayment(payment.identifier);

    if (!latestPayment || !latestPayment.status.paid || latestPayment.status.moved) {
      return latestPayment ?? payment;
    }

    const settlementTarget = await resolvePendingSettlement(latestPayment);

    if (settlementTarget.status.moved || settlementTarget.settlement?.signature) {
      return settlementTarget;
    }

    const settlement = await movePaymentBalanceToRecipient(settlementTarget);
    const movedAt = nowUtcIso();
    const movedPayment: StoredPayment = {
      ...settlementTarget,
      status: {
        ...settlementTarget.status,
        moved: movedAt,
      },
      settlement: {
        ...settlementTarget.settlement,
        signature: settlement.signature,
        balanceLamports: settlement.balanceLamports,
        movedLamports: settlement.movedLamports,
        feeLamports: settlement.feeLamports,
        lastChecked: movedAt,
        lastError: undefined,
      },
    };

    await savePayment(movedPayment);

    return movedPayment;
  } catch (error) {
    const failedPayment = await findPayment(payment.identifier);
    const paymentToSave = failedPayment ?? payment;

    if (error instanceof SolanaSettlementPendingError) {
      return savePendingSettlementError(paymentToSave, error);
    }

    const updatedPayment: StoredPayment = {
      ...paymentToSave,
      settlement: {
        ...paymentToSave.settlement,
        lastChecked: nowUtcIso(),
        lastError: getErrorMessage(error),
      },
    };

    await savePayment(updatedPayment);
    console.error("Payment settlement failed", error);

    return updatedPayment;
  } finally {
    await releaseSettlementLock(payment.identifier, lockToken);
  }
}

export async function refreshPaymentStatus(
  identifier: string,
): Promise<StoredPayment | null> {
  const payment = await findPayment(identifier);

  if (!payment || payment.status.moved) {
    return payment;
  }

  try {
    const paidPayment = await markPaidIfFunded(payment);

    return settlePaidPayment(paidPayment);
  } catch (error) {
    console.error("Payment status refresh failed", error);

    return payment;
  }
}
