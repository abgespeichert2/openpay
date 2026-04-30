import {
  clusterApiUrl,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { PaymentNetwork, StoredPayment } from "@/lib/payment/types";

const COMMITMENT: Commitment = "confirmed";
const FALLBACK_TRANSFER_FEE_LAMPORTS = 5_000;

export interface CreatedPaymentWallet {
  address: string;
  secretKey: number[];
}

export interface SolanaSettlementResult {
  signature: string;
  balanceLamports: number;
  movedLamports: number;
  feeLamports: number;
}

export interface SettlementSignatureResult {
  state: "confirmed" | "failed" | "pending";
  error?: string;
}

export class SolanaSettlementPendingError extends Error {
  public readonly signature: string;
  public readonly balanceLamports: number;
  public readonly movedLamports: number;
  public readonly feeLamports: number;

  constructor(
    signature: string,
    balanceLamports: number,
    movedLamports: number,
    feeLamports: number,
    message: string,
  ) {
    super(message);
    this.name = "SolanaSettlementPendingError";
    this.signature = signature;
    this.balanceLamports = balanceLamports;
    this.movedLamports = movedLamports;
    this.feeLamports = feeLamports;
  }
}

function stringifySolanaError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown Solana error";
  }
}

function getConnection(network: PaymentNetwork): Connection {
  if (network === "dev") {
    return new Connection(
      process.env.SOLANA_DEV_RPC_URL ?? clusterApiUrl("devnet"),
      COMMITMENT,
    );
  }

  if (network === "test") {
    return new Connection(
      process.env.SOLANA_TEST_RPC_URL ?? clusterApiUrl("testnet"),
      COMMITMENT,
    );
  }

  return new Connection(
    process.env.SOLANA_MAIN_RPC_URL ?? clusterApiUrl("mainnet-beta"),
    COMMITMENT,
  );
}

function getPaymentKeypair(payment: StoredPayment): Keypair {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(payment.wallet.secretKey));

  if (keypair.publicKey.toBase58() !== payment.address) {
    throw new Error("Stored payment wallet does not match payment address.");
  }

  return keypair;
}

async function estimateTransferFeeLamports(
  connection: Connection,
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey,
  blockhash: string,
  lastValidBlockHeight: number,
): Promise<number> {
  const transaction = new Transaction({
    feePayer: fromPublicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: fromPublicKey,
      toPubkey: toPublicKey,
      lamports: 1,
    }),
  );

  const fee = await connection.getFeeForMessage(
    transaction.compileMessage(),
    COMMITMENT,
  );

  return fee.value ?? FALLBACK_TRANSFER_FEE_LAMPORTS;
}

export function createPaymentWallet(): CreatedPaymentWallet {
  const keypair = Keypair.generate();

  return {
    address: keypair.publicKey.toBase58(),
    secretKey: Array.from(keypair.secretKey),
  };
}

export async function getPaymentBalanceLamports(
  payment: StoredPayment,
): Promise<number> {
  return getConnection(payment.network).getBalance(
    new PublicKey(payment.address),
    COMMITMENT,
  );
}

export async function getSettlementSignatureState(
  payment: StoredPayment,
  signature: string,
): Promise<SettlementSignatureResult> {
  const response = await getConnection(payment.network).getSignatureStatuses(
    [signature],
    {
      searchTransactionHistory: true,
    },
  );
  const status = response.value[0];

  if (!status) {
    return {
      state: "pending",
    };
  }

  if (status.err) {
    return {
      state: "failed",
      error: stringifySolanaError(status.err),
    };
  }

  if (
    status.confirmationStatus === "confirmed" ||
    status.confirmationStatus === "finalized" ||
    typeof status.confirmations === "number"
  ) {
    return {
      state: "confirmed",
    };
  }

  return {
    state: "pending",
  };
}

export async function movePaymentBalanceToRecipient(
  payment: StoredPayment,
): Promise<SolanaSettlementResult> {
  const source = getPaymentKeypair(payment);
  const recipient = new PublicKey(payment.recipient);
  const connection = getConnection(payment.network);
  const balanceLamports = await connection.getBalance(source.publicKey, COMMITMENT);

  if (balanceLamports < payment.expectedLamports) {
    throw new Error("Payment wallet has not received the expected balance.");
  }

  const latestBlockhash = await connection.getLatestBlockhash(COMMITMENT);
  const feeLamports = await estimateTransferFeeLamports(
    connection,
    source.publicKey,
    recipient,
    latestBlockhash.blockhash,
    latestBlockhash.lastValidBlockHeight,
  );
  const movedLamports = balanceLamports - feeLamports;

  if (movedLamports <= 0) {
    throw new Error("Payment wallet balance cannot cover Solana transaction fee.");
  }

  const transaction = new Transaction({
    feePayer: source.publicKey,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: source.publicKey,
      toPubkey: recipient,
      lamports: movedLamports,
    }),
  );

  transaction.sign(source);

  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    maxRetries: 3,
    preflightCommitment: COMMITMENT,
  });

  try {
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      COMMITMENT,
    );

    if (confirmation.value.err) {
      throw new Error(stringifySolanaError(confirmation.value.err));
    }
  } catch (error) {
    throw new SolanaSettlementPendingError(
      signature,
      balanceLamports,
      movedLamports,
      feeLamports,
      `Settlement transaction was sent but confirmation is pending: ${stringifySolanaError(error)}`,
    );
  }

  return {
    signature,
    balanceLamports,
    movedLamports,
    feeLamports,
  };
}
