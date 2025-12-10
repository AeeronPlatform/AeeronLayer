export interface X402PaymentDetails {
  payee: string;
  amount: number;
  token: string;
  nonce: string;
  expiry: number;
  network: "mainnet-beta" | "devnet" | "localnet";
  version: 1;
}

export interface X402PaymentProof {
  signature: string;
  txHash: string;
  nonce: string;
  timestamp: number;
}

export interface X402PaymentError {
  code:
    | "PAYMENT_REQUIRED"
    | "INVALID_PROOF"
    | "NONCE_USED"
    | "PROOF_EXPIRED"
    | "AMOUNT_MISMATCH"
    | "TX_NOT_FOUND"
    | "TX_FAILED";
  message: string;
  details?: Record<string, unknown>;
}

export interface X402SettledContext {
  payer: string;
  amount: number;
  token: string;
  txHash: string;
  settledAt: number;
}

export type X402Network = "mainnet-beta" | "devnet" | "localnet";
export type X402Token = "SOL" | string;
