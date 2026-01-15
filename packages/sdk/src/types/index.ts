import { Connection, Keypair, PublicKey } from "@solana/web3.js";

export type PaymentToken = "SOL" | "USDC" | string; // string = SPL mint address

export interface AeeronClientConfig {
  /** Solana RPC connection */
  connection: Connection;
  /** Payer keypair (agent wallet) */
  payer: Keypair;
  /** Override the on-chain program ID */
  programId?: PublicKey;
  /** Default token for payments (default: "SOL") */
  defaultToken?: PaymentToken;
  /** Proof TTL in seconds (default: 300) */
  proofTtlSeconds?: number;
}

export interface PaymentDetailsData {
  /** Payee's Solana wallet address */
  payee: string;
  /** Amount in lamports (SOL) or base units (SPL) */
  amount: number;
  /** Token identifier */
  token: PaymentToken;
  /** One-time nonce (hex string) */
  nonce: string;
  /** Unix expiry timestamp */
  expiry: number;
  /** Solana network */
  network: "mainnet-beta" | "devnet" | "localnet";
  /** x402 protocol version */
  version: number;
}

export interface PaymentProofData {
  /** Ed25519 signature (base58) */
  signature: string;
  /** Solana transaction hash */
  txHash: string;
  /** Nonce that was used */
  nonce: string;
  /** Unix timestamp of proof creation */
  timestamp: number;
}

export interface ChannelState {
  /** Channel PDA address */
  address: string;
  /** Payer wallet */
  payer: string;
  /** Payee wallet */
  payee: string;
  /** Total deposited (lamports) */
  balance: number;
  /** Total settled (lamports) */
  settled: number;
  /** Available = balance - settled */
  available: number;
  /** Sequence counter */
  sequence: number;
  /** Expiry timestamp (0 = no expiry) */
  expiry: number;
  /** Whether channel is open */
  isOpen: boolean;
}

export interface FetchWithPaymentOptions extends RequestInit {
  /** Maximum amount willing to pay (lamports). Rejects if server asks for more. */
  maxAmount?: number;
  /** Override token for this request */
  token?: PaymentToken;
  /** Called before payment is submitted */
  onBeforePayment?: (details: PaymentDetailsData) => void | Promise<void>;
  /** Called after payment is confirmed */
  onPaymentSettled?: (proof: PaymentProofData) => void | Promise<void>;
}

export interface SettlementResult {
  txHash: string;
  proof: PaymentProofData;
  amount: number;
  token: PaymentToken;
  settledAt: number;
}
