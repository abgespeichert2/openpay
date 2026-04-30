export const PAYMENT_NETWORKS = ["dev", "test", "main"] as const;

export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

export interface PaymentAmount {
  value: number;
  notional: number;
  currency: "$";
  change?: number;
}

export interface PaymentTheme {
  "background-page": string;
  "background-box": string;
  "background-field": string;
  "status-waiting": string;
  "status-done": string;
  "price-down": string;
  "price-up": string;
  "outline-box": string;
  "outline-field": string;
  "text-primary": string;
  "text-secondary": string;
}

export const DEFAULT_PAYMENT_THEME: PaymentTheme = {
  "background-page": "#f6f5f1",
  "background-box": "#ffffff",
  "background-field": "#fafaf9",
  "status-waiting": "#d6d3d1",
  "status-done": "#10b981",
  "price-down": "#16a34a",
  "price-up": "#dc2626",
  "outline-box": "#d6d3d1",
  "outline-field": "#d6d3d1",
  "text-primary": "#0c0a09",
  "text-secondary": "#78716c",
};

export interface PaymentMeta {
  name: string;
  description: string;
  redirect?: {
    finished?: string;
    cancelled?: string;
  };
  theme?: PaymentTheme;
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
