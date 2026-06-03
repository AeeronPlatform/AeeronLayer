/**
   * Aeeron Protocol — on-chain constants
   *
   * These values are canonical and must stay in sync with the deployed
   * Solana programs. Do NOT hardcode them in application code; import from here.
   */

  // ─── $AEERON Token ────────────────────────────────────────────────────────────

  /** SPL mint address of the $AEERON utility token (pump.fun). */
  export const AEERON_MINT = 'DLnWxjvV9rYFgyScBGH7eFtsQqDtyeDsaQTxynnRpump' as const;

  /** Human-readable token ticker. */
  export const AEERON_SYMBOL = '$AEERON' as const;

  /** Decimals as defined in the mint account. */
  export const AEERON_DECIMALS = 6;

  /**
   * Convert a raw on-chain amount (u64, no decimals) to a display string.
   *
   *   aeeronRawToDisplay(1_000_000n) // "1.000000"
   */
  export function aeeronRawToDisplay(raw: bigint): string {
    const factor = BigInt(10 ** AEERON_DECIMALS);
    const whole  = raw / factor;
    const frac   = raw % factor;
    return `${whole}.${frac.toString().padStart(AEERON_DECIMALS, '0')}`;
  }

  /**
   * Convert a display amount string to raw lamport-equivalent units.
   *
   *   aeeronDisplayToRaw('1.5') // 1_500_000n
   */
  export function aeeronDisplayToRaw(display: string): bigint {
    const [w = '0', f = ''] = display.split('.');
    const frac = f.padEnd(AEERON_DECIMALS, '0').slice(0, AEERON_DECIMALS);
    return BigInt(w) * BigInt(10 ** AEERON_DECIMALS) + BigInt(frac);
  }

  // ─── x402 Payment defaults ───────────────────────────────────────────────────

  /** Default max price per agent call in SOL lamports (0.01 SOL). */
  export const DEFAULT_MAX_PRICE_LAMPORTS = 10_000_000n;

  /** Minimum viable payment for a single x402 request (100 lamports). */
  export const MIN_PAYMENT_LAMPORTS = 100n;

  /** x402 protocol version this SDK targets. */
  export const X402_PROTOCOL_VERSION = '1' as const;

  // ─── Network ──────────────────────────────────────────────────────────────────

  export const SOLANA_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
  export const SOLANA_DEVNET_RPC  = 'https://api.devnet.solana.com';
  