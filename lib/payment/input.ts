import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { AppError } from "@/lib/http";
import { fetchSolUsdPrice } from "@/lib/payment/pricing";
import type {
  PaymentAmount,
  PaymentMeta,
  PaymentNetwork,
} from "@/lib/payment/types";
import { PAYMENT_NETWORKS } from "@/lib/payment/types";

export interface ParsedCreatePaymentInput {
  recipient: string;
  network: PaymentNetwork;
  meta: PaymentMeta;
  amount: PaymentAmount;
  expectedLamports: number;
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

function readNumberValue(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError("INVALID_REQUEST", `${label} must be a number.`);
  }

  return value;
}

function readOptionalNumberValue(
  value: unknown,
  label: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return readNumberValue(value, label);
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

function readRecipient(value: unknown): string {
  if (typeof value !== "string") {
    throw new AppError(
      "INVALID_REQUEST",
      "recipient must be a valid Solana public key.",
    );
  }

  try {
    return new PublicKey(value.trim()).toBase58();
  } catch {
    throw new AppError(
      "INVALID_REQUEST",
      "recipient must be a valid Solana public key.",
    );
  }
}

function roundNotional(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function parseCreatePaymentRequest(
  body: unknown,
): Promise<ParsedCreatePaymentInput> {
  if (!isRecord(body)) {
    throw new AppError("INVALID_REQUEST", "Request body must be an object.");
  }

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

  const meta = body.meta;
  const amountRecord = body.amount;

  if (!isRecord(meta)) {
    throw new AppError("INVALID_REQUEST", "meta is required.");
  }

  if (!isRecord(amountRecord)) {
    throw new AppError("INVALID_REQUEST", "amount is required.");
  }

  const value = readNumberValue(
    amountRecord.value ?? amountRecord.solana,
    "amount.value",
  );
  const change = readOptionalNumberValue(amountRecord.change, "amount.change");

  if (value <= 0) {
    throw new AppError("INVALID_REQUEST", "amount.value must be positive.");
  }

  if (change !== undefined && (change < -1 || change > 1)) {
    throw new AppError(
      "INVALID_REQUEST",
      "amount.change must be between -1 and 1.",
    );
  }

  const expectedLamports = Math.round(value * LAMPORTS_PER_SOL);

  if (!Number.isSafeInteger(expectedLamports) || expectedLamports <= 0) {
    throw new AppError(
      "INVALID_REQUEST",
      "amount.value is outside the supported range.",
    );
  }

  const solUsdPrice = await fetchSolUsdPrice();
  const amount: PaymentAmount = {
    value,
    notional: roundNotional(value * solUsdPrice),
    currency: "$",
    ...(change !== undefined ? { change } : {}),
  };

  return {
    recipient: readRecipient(body.recipient ?? body.receipient),
    network: network as PaymentNetwork,
    meta: {
      name: readString(meta, "name", "meta.name", 160),
      description: readString(
        meta,
        "description",
        "meta.description",
        1_000,
      ),
      redirect: readOptionalRedirect(meta.redirect),
    },
    amount,
    expectedLamports,
  };
}
