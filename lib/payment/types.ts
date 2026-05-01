export const PAYMENT_NETWORKS = ["dev", "test", "main"] as const;

export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

export interface PaymentAmount {
  value: number;
  notional: number;
  currency: "$";
  change?: number;
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
