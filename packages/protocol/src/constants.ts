import { PublicKey } from '@solana/web3.js';

  // ─── Program ──────────────────────────────────────────────────────────────────

  export const AEERON_PROGRAM_ID = new PublicKey(
    'AERNprot1111111111111111111111111111111111111',
  );

  // ─── AERN Token ───────────────────────────────────────────────────────────────

  /** SPL Token-2022 mint. Deployed Jun 1 2026. Freeze + mint authority revoked. */
  export const AERN_MINT = new PublicKey(
    'AERNyKLBWMiMpLbZ3gJB7aECsTHEfn2Q8v1D5rXkm9j',
  );

  export const AERN_DECIMALS = 9;
  export const AERN_SYMBOL   = 'AERN';
  export const AERN_NAME     = 'Aeeron';

  // ─── Payment assets ───────────────────────────────────────────────────────────

  export const SOL_MINT = new PublicKey(
    'So11111111111111111111111111111111111111112',
  );

  export const USDC_MINT = new PublicKey(
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  );

  export const SUPPORTED_MINTS = [SOL_MINT, USDC_MINT, AERN_MINT] as const;

  // ─── Explorer links ───────────────────────────────────────────────────────────

  export const EXPLORER_BASE  = 'https://explorer.solana.com';
  export const BIRDEYE_BASE   = 'https://birdeye.so/token';
  export const DEXSCREENER_BASE = 'https://dexscreener.com/solana';

  export function explorerTx(sig: string, cluster = 'mainnet-beta') {
    return `${EXPLORER_BASE}/tx/${sig}?cluster=${cluster}`;
  }
  export function explorerAddress(addr: string, cluster = 'mainnet-beta') {
    return `${EXPLORER_BASE}/address/${addr}?cluster=${cluster}`;
  }
  export function birdeyeToken(mint = AERN_MINT.toBase58()) {
    return `${BIRDEYE_BASE}/${mint}?chain=solana`;
  }
  export function dexscreenerPair(mint = AERN_MINT.toBase58()) {
    return `${DEXSCREENER_BASE}/${mint}`;
  }

  // ─── x402 headers ────────────────────────────────────────────────────────────

  export const X402_PAYMENT_DETAILS_HEADER = 'X-Payment-Details';
  export const X402_PAYMENT_PROOF_HEADER   = 'X-Payment-Proof';

  // ─── Defaults ─────────────────────────────────────────────────────────────────

  export const DEFAULT_PROOF_TTL_MS        = 30_000;
  export const DEFAULT_CHANNEL_EXPIRY_SEC  = 7 * 24 * 60 * 60; // 7 days
  export const MAX_PAYMENT_RETRY           = 3;
  