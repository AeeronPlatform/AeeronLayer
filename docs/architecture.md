# Architecture

## System Overview

Aeeron is a layered system. Each layer is independent and can be used without the others.

```
┌─────────────────────────────────────────────────────────┐
│                    Applications                         │
│     AI Agents  ·  dApps  ·  APIs  ·  Microservices      │
└────────────────────────┬────────────────────────────────┘
                         │ @aeeron/sdk
┌────────────────────────▼────────────────────────────────┐
│                   Protocol Layer                         │
│  x402 Codec  ·  Proof Builder  ·  Payment Verifier       │
│              @aeeron/protocol                            │
└────────────────────────┬────────────────────────────────┘
                         │ Solana Web3
┌────────────────────────▼────────────────────────────────┐
│                   Settlement Layer                       │
│   aeeron_protocol (Anchor)  ·  SPL Token  ·  System Pgm  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                    Solana L1                             │
│          Mainnet-Beta  ·  Devnet  ·  Localnet            │
└─────────────────────────────────────────────────────────┘
```

---

## On-Chain Program

The `aeeron_protocol` Anchor program manages:

### Accounts

| Account | PDA Seeds | Purpose |
|---|---|---|
| `PaymentChannel` | `["channel", payer, payee]` | Channel state |
| `NonceRecord` | `["nonce", nonce_bytes]` | Replay protection |
| `PaymentReceipt` | `["receipt", nonce_bytes]` | Auditable on-chain record |
| Vault | `["vault", channel_address]` | SOL escrow for channels |

### Instructions

| Instruction | Signer | Description |
|---|---|---|
| `open_channel` | payer | Create channel + deposit collateral |
| `fund_channel` | payer | Add more collateral to existing channel |
| `settle_payment` | payee | Claim payment from channel vault |
| `close_channel` | payer | Close channel + refund remainder |
| `direct_pay` | payer | Atomic pay-per-request (no channel) |
| `register_nonce` | authority | Pre-register a nonce (for advanced flows) |
| `emit_receipt` | authority | Write an on-chain receipt |

---

## SDK Architecture

```
@aeeron/sdk
├── AeeronClient          # Main entry point for payers
│   ├── fetchWithPayment  # Intercepts 402, pays, retries
│   └── settle            # Direct payment submission
├── ChannelManager        # Open, fund, close, query channels
└── protocol/
    ├── X402Codec         # Encode/decode x402 headers
    ├── PaymentProof      # Sign + verify proof messages
    ├── PaymentDetails    # Validate and wrap payment details
    └── transactions      # Build Solana transactions

@aeeron/sdk/server
├── AeeronMiddleware      # Express middleware (resource servers)
└── PaymentVerifier       # On-chain proof verification
```

---

## Gateway API

The `@aeeron/api` server is an optional infrastructure component that:

- Generates payment details for resource servers without SDK
- Verifies proofs on behalf of lightweight resource servers
- Provides a REST interface for channel queries
- Serves as a reference implementation

It is **not required** — the SDK handles everything client-side.

---

## Design Decisions

### Why Solana?
Sub-second finality (~400ms slots) and sub-cent fees make Solana the only production-viable chain for machine-to-machine micropayments in 2024. Channel batching is optional since direct-pay overhead is already negligible.

### Why Ed25519 proof signatures?
Proof signatures bind the payment proof to the payer's wallet without requiring an additional on-chain instruction. A malicious payee cannot forge a proof for a payer they do not control.

### Why per-nonce PDA accounts?
On-chain nonce registries are the simplest replay protection that doesn't require oracle trust. Each `NonceRecord` account is initialized exactly once; a second `direct_pay` with the same nonce will fail at the account init step.

### Why base64(JSON) headers?
The x402 spec doesn't mandate an encoding. We chose base64(JSON) over binary encoding for debuggability — developers can decode headers with a single `atob()` call in the browser console.

### Why Apache 2.0?
We want Aeeron to be adopted broadly. Apache 2.0 is compatible with most commercial and open-source licenses, including MIT, BSD, and GPLv3.
