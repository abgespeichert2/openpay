import { randomBytes } from "crypto";
import { AppError, getErrorMessage } from "@/lib/http";
import { parseCreatePaymentRequest } from "@/lib/payment/input";
import {
  toCreatePaymentResponse,
  toPublicStatusResponse,
  toReceiptResponse,
} from "@/lib/payment/response";
import {
  acquireSettlementLock,
  findPayment,
  paymentExists,
  releaseSettlementLock,
  savePayment,
} from "@/lib/payment/store";
import type { StoredPayment } from "@/lib/payment/types";
import {
  createPaymentWallet,
  getPaymentBalanceLamports,
  getSettlementSignatureState,
  movePaymentBalanceToRecipient,
  SolanaSettlementPendingError,
} from "@/lib/solana";

const PAYMENT_IDENTIFIER_BYTES = 6;
const PAYMENT_IDENTIFIER_ATTEMPTS = 5;

export {
  paymentExists,
  toCreatePaymentResponse,
  toPublicStatusResponse,
  toReceiptResponse,
};

export type {
  PaymentAmount,
  PaymentMeta,
  PaymentNetwork,
  PaymentStatus,
  PaymentTheme,
  PublicPaymentStatusResponse,
  StoredPayment,
} from "@/lib/payment/types";

function nowUtcIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
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

export async function createPaymentOrder(body: unknown): Promise<StoredPayment> {
  const input = await parseCreatePaymentRequest(body);
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

    if (
      !latestPayment ||
      !latestPayment.status.paid ||
      latestPayment.status.moved
    ) {
      return latestPayment ?? payment;
    }

    const settlementTarget = await resolvePendingSettlement(latestPayment);

    if (
      settlementTarget.status.moved ||
      settlementTarget.settlement?.signature
    ) {
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
