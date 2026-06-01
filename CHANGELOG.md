# Changelog

  All notable changes to this project are documented in this file.

  ## [0.1.1] — 2026-06-01

  ### Added
  - AERN token deployed on Solana mainnet-beta
    - Mint: `AERNyKLBWMiMpLbZ3gJB7aECsTHEfn2Q8v1D5rXkm9j`
    - SPL Token-2022, 9 decimals, 1B fixed supply
    - Mint and freeze authority permanently revoked
  - Jupiter DEX liquidity live: AERN/SOL and AERN/USDC pairs on Raydium CLMM
  - Swap widget on dashboard now points to real mint (placeholder removed)
  - `birdeyeToken()` and `dexscreenerPair()` helpers in constants

  ### Changed
  - `AERN_MINT` in `@aeeron/protocol` updated from placeholder to live mainnet address
  - SwapWidget imports mint addresses from constants instead of inline strings

  ## [0.1.0] — 2026-05-26

  ### Added
  - Initial public release of Aeeron x402 sovereign payment protocol
  - `@aeeron/sdk`: AeeronClient, ChannelManager, X402Codec, PaymentProof, AeeronMiddleware
  - `@aeeron/protocol`: on-chain types, tokenomics helpers
  - `@aeeron/contracts`: Anchor IDL types and program helper
  - Gateway API: Express server with /v1/payments, /v1/channels, /v1/proof routes
  - Dashboard: React + Vite + Tailwind with live channel and payment views
  