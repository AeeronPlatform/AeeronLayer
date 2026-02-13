import { LAMPORTS_PER_SOL, USDC_DECIMALS } from "../constants";

/**
 * Convert SOL (human-readable) to lamports.
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL (human-readable).
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Convert USDC (human-readable) to base units.
 */
export function usdcToBaseUnits(usdc: number): number {
  return Math.round(usdc * 10 ** USDC_DECIMALS);
}

/**
 * Convert USDC base units to human-readable.
 */
export function baseUnitsToUsdc(units: number): number {
  return units / 10 ** USDC_DECIMALS;
}

/**
 * Format a Solana address for display (first 4 + last 4 chars).
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10_000,
  }: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Generate a 32-byte cryptographically random nonce as a hex string.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("hex");
}
