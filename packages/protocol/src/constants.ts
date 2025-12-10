export const X402_VERSION = 1 as const;
export const X402_PROTOCOL_NAME = "aeeron/x402" as const;

export const X402_HEADERS = {
  PAYMENT_DETAILS: "x-payment-details",
  PAYMENT_PROOF: "x-payment-proof",
  PAYMENT_VERSION: "x-payment-version",
  PAYMENT_NETWORK: "x-payment-network",
} as const;

export const X402_STATUS = {
  PAYMENT_REQUIRED: 402,
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
} as const;

export const AEERON_PROGRAM_ID = "AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" as const;

export const SOLANA_TOKEN_DECIMALS = {
  SOL: 9,
  USDC: 6,
} as const;

export const DEFAULT_PAYMENT_TTL_SECONDS = 300;
export const MIN_PAYMENT_TTL_SECONDS = 30;
export const MAX_PAYMENT_TTL_SECONDS = 3600;
