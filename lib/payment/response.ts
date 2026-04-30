import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type {
  PublicPaymentStatusResponse,
  StoredPayment,
} from "@/lib/payment/types";

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
