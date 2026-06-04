# Changelog

  ## [Unreleased]

  ## [0.4.0] — 2026-06-04

  ### Fee Simulator — final release

  - `packages/protocol/src/feeSimulator.ts` — `simulateDirectPay`, `simulateChannel`, `simulateComparison` with break-even calculation
  - `GET /v1/fees/simulate` — query-param API endpoint, supports `mode=direct|channel|both`
  - Dashboard `FeeSimulatorPage` v1.0:
    - 4 price presets (Micro / Standard / Heavy / Premium)
    - calls slider up to 500, live SOL/USD conversion
    - cost breakdown bars with sublabels
    - cost summary table (SOL, USD, per-call)
    - **Export JSON** — downloads full estimate as `aeeron-fee-estimate.json`
    - **Share link** — copies pre-filled URL to clipboard
    - Recommendation banner with savings amount and break-even threshold

  ## [0.3.0] — 2026-06-03

  - Payment proof verifier (`verifyPaymentProof`)
  - Analytics dashboard page (sparklines, bar charts, top agents)
  - Rate limiter + request logger middleware

  ## [0.2.0] — 2026-06-02

  - `AgentPool` connection pooling, MCP bridge (`toMcpTools`, `createMcpHandler`)
  - Agent registry API routes (`/v1/agents`)
  - `AgentSessionManager`, sessions API (`/v1/sessions`), `budgetGuard` middleware

  ## [0.1.0] — 2026-05-30

  - x402 payment flow, channel open/close, proof endpoint
  - Webhook delivery with HMAC verification
  - `@aeeron/agent-connect` scaffold — `AgentConnection`, `AgentChannelConnection`
  - `$AEERON` SPL token mint registered: `DLnWxjvV9rYFgyScBGH7eFtsQqDtyeDsaQTxynnRpump`
  