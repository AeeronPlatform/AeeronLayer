import { PublicKey } from "@solana/web3.js";

export const AEERON_PROGRAM_ID = new PublicKey(
  "AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

export const USDC_MINT_MAINNET = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);

export const USDC_MINT_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const SUPPORTED_TOKENS = {
  SOL: "SOL",
  USDC: USDC_MINT_MAINNET.toBase58(),
} as const;

export const DEFAULT_PROOF_TTL_SECONDS = 300;
export const X402_HEADER_PAYMENT_DETAILS = "x-payment-details";
export const X402_HEADER_PAYMENT_PROOF = "x-payment-proof";
export const X402_HEADER_VERSION = "x-payment-version";
export const X402_HEADER_NETWORK = "x-payment-network";
export const X402_PROTOCOL_VERSION = 1;

export const LAMPORTS_PER_SOL = 1_000_000_000;
export const USDC_DECIMALS = 6;
