import type { PaymentToken } from "../types";

export interface AeeronMiddlewareConfig {
  /** Wallet that will receive payments */
  payee: string;
  /** Required payment amount in lamports (SOL) or base units (SPL) */
  amount: number;
  /** Token to accept (default: "SOL") */
  token?: PaymentToken;
  /** Solana network (default: "mainnet-beta") */
  network?: "mainnet-beta" | "devnet" | "localnet";
  /** Solana RPC endpoint */
  rpcUrl?: string;
  /** How long (seconds) the 402 details are valid (default: 300) */
  ttlSeconds?: number;
  /** Skip on-chain proof verification (dev only) */
  skipVerification?: boolean;
}

export interface VerifyProofResult {
  valid: boolean;
  payerAddress?: string;
  amount?: number;
  txHash?: string;
  error?: string;
}
