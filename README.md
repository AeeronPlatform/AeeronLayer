# Aeeron Protocol

**x402 Sovereign Layer for Non-Custodial Payments within Agent-to-Agent Economy**

Aeeron is an open-source, non-custodial payment infrastructure built on Solana, implementing the x402 payment standard for autonomous agent economies. It enables agents, dApps, and services to transact seamlessly without custodians, intermediaries, or trust assumptions.

---

## Overview

```
 ┌─────────────┐      x402 Payment Request       ┌─────────────┐
 │   Agent A   │ ──────────────────────────────► │  Resource   │
 │  (Payer)    │                                  │   Server    │
 │             │ ◄────────────────────────────── │             │
 └─────┬───────┘      402 Payment Required        └─────────────┘
       │
       │  sign & submit
       ▼
 ┌─────────────┐      on-chain settlement         ┌─────────────┐
 │   Aeeron    │ ──────────────────────────────► │   Solana    │
 │  Protocol   │                                  │  Mainnet    │
 └─────────────┘                                  └─────────────┘
```

### Key Properties

- **Non-custodial** — funds never leave the payer's wallet until settlement
- **Agent-native** — designed for autonomous AI and software agents
- **Composable** — plugs into any HTTP stack via standard x402 headers
- **Solana-powered** — sub-second finality, sub-cent fees
- **Sovereign** — no central operator, no KYC, no permissions

---

## Architecture

```
aeeron/
├── programs/                  # On-chain Solana programs (Rust + Anchor)
│   └── aeeron-protocol/       # Core payment settlement program
├── packages/
│   ├── sdk/                   # @aeeron/sdk — TypeScript client SDK
│   ├── protocol/              # @aeeron/protocol — x402 types & codec
│   └── contracts/             # @aeeron/contracts — generated IDL types
├── apps/
│   ├── api/                   # Aeeron Gateway API (Express)
│   └── dashboard/             # Protocol dashboard (React + Vite)
└── docs/                      # Protocol specification
```

---

## Packages

| Package | Description | Version |
|---|---|---|
| `@aeeron/sdk` | TypeScript client for payers and resource servers | `0.1.0` |
| `@aeeron/protocol` | x402 codec, types, and validation | `0.1.0` |
| `@aeeron/contracts` | Auto-generated Anchor IDL types | `0.1.0` |

---

## Quick Start

### Install the SDK

```bash
npm install @aeeron/sdk @solana/web3.js
```

### Payer (Agent sending payment)

```typescript
import { AeeronClient } from "@aeeron/sdk";
import { Keypair, Connection } from "@solana/web3.js";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const payer = Keypair.fromSecretKey(/* your key */);

const client = new AeeronClient({ connection, payer });

// Intercept a 402 response and pay
const response = await client.fetchWithPayment("https://api.example.com/data");
console.log(await response.json());
```

### Resource Server (Agent accepting payment)

```typescript
import { AeeronMiddleware } from "@aeeron/sdk/server";

app.use(
  "/premium",
  AeeronMiddleware({
    payee: new PublicKey("YourWalletAddress..."),
    amount: 0.001,          // SOL
    token: "SOL",           // or "USDC"
    network: "mainnet-beta",
  })
);

app.get("/premium/data", (req, res) => {
  res.json({ secret: "paid content" });
});
```

---

## Protocol Specification

Aeeron implements the [x402 payment protocol](https://x402.org) on Solana.

### Payment Flow

1. **Client** requests a resource → receives `402 Payment Required`
2. Server includes `X-Payment-Details` header with:
   - `payee` — destination wallet
   - `amount` — required payment in lamports
   - `token` — SOL or SPL token mint
   - `nonce` — one-time use nonce
   - `expiry` — unix timestamp
3. **Client** signs and submits a Solana transaction
4. **Client** retries request with `X-Payment-Proof` header
5. **Server** verifies on-chain settlement → returns `200 OK`

### Headers

```
Request (retry):
  X-Payment-Proof: base64(signature + txHash + nonce)

Response (402):
  X-Payment-Details: base64(PaymentDetails JSON)
  X-Payment-Version: 1
  X-Payment-Network: solana-mainnet
```

---

## On-Chain Program

The Aeeron on-chain program handles:

- **Payment channels** — open, fund, settle, close
- **Nonce registry** — prevents replay attacks
- **Escrow vaults** — temporary holds for streaming payments
- **Settlement proofs** — verifiable on-chain receipts

Program ID (mainnet): `AER1onXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

---

## Development

### Prerequisites

- Node.js >= 20
- Rust >= 1.75
- Solana CLI >= 1.18
- Anchor CLI >= 0.30

### Setup

```bash
git clone https://github.com/aeeron-protocol/aeeron
cd aeeron
pnpm install
```

### Build

```bash
# Build Solana program
anchor build

# Build TypeScript packages
pnpm build

# Run tests
pnpm test
```

### Local validator

```bash
solana-test-validator &
anchor deploy --provider.cluster localnet
pnpm dev
```

---

## Contributing

We welcome contributions. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and open a PR.

---

## License

Apache 2.0 — see [LICENSE](./LICENSE)

---

## Security

For security disclosures, contact security@aeeron.xyz. Do not open public issues for vulnerabilities.
