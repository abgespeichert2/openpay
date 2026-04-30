import { randomBytes } from "crypto";
import { AppError } from "@/lib/http";
import { getRedis } from "@/lib/redis";
import type { StoredPayment } from "@/lib/payment/types";

const PAYMENT_TTL_SECONDS = 48 * 60 * 60;
const SETTLEMENT_LOCK_TTL_SECONDS = 30;
const PAYMENT_KEY_PREFIX = "openpay:payment";
const PAYMENT_LOCK_PREFIX = "openpay:payment-lock";

function paymentKey(identifier: string): string {
  return `${PAYMENT_KEY_PREFIX}:${identifier}`;
}

function settlementLockKey(identifier: string): string {
  return `${PAYMENT_LOCK_PREFIX}:${identifier}`;
}

function normalizeStoredPayment(payment: StoredPayment): StoredPayment {
  const amount = payment.amount as StoredPayment["amount"] & {
    solana?: unknown;
  };

  if (typeof amount.value === "number") {
    return payment;
  }

  if (typeof amount.solana !== "number") {
    return payment;
  }

  return {
    ...payment,
    amount: {
      value: amount.solana,
      notional: typeof amount.notional === "number" ? amount.notional : 0,
      currency: "$",
      ...(typeof amount.change === "number" ? { change: amount.change } : {}),
    },
  };
}

function parseStoredPayment(raw: string): StoredPayment {
  try {
    const payment = JSON.parse(raw) as StoredPayment;

    if (!payment || payment.version !== 1 || !payment.identifier) {
      throw new Error("Invalid payment payload.");
    }

    return normalizeStoredPayment(payment);
  } catch (error) {
    console.error("Invalid payment record in Redis", error);

    throw new AppError(
      "PAYMENT_RECORD_INVALID",
      "Payment record is invalid.",
    );
  }
}

export async function savePayment(payment: StoredPayment): Promise<void> {
  const redis = await getRedis();

  await redis.set(paymentKey(payment.identifier), JSON.stringify(payment), {
    expiration: {
      type: "EX",
      value: PAYMENT_TTL_SECONDS,
    },
  });
}

export async function findPayment(
  identifier: string,
): Promise<StoredPayment | null> {
  const redis = await getRedis();
  const raw = await redis.get(paymentKey(identifier));

  return raw ? parseStoredPayment(raw) : null;
}

export async function paymentExists(identifier: string): Promise<boolean> {
  const redis = await getRedis();

  return (await redis.exists(paymentKey(identifier))) === 1;
}

export async function acquireSettlementLock(
  identifier: string,
): Promise<string | null> {
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

export async function releaseSettlementLock(
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
