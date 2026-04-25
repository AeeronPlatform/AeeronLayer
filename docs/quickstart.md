# Quickstart Guide

Get Aeeron running in under 5 minutes.

---

## Prerequisites

- Node.js >= 20
- A Solana wallet with SOL for fees

---

## 1. Install the SDK

```bash
npm install @aeeron/sdk @solana/web3.js
# or
pnpm add @aeeron/sdk @solana/web3.js
```

---

## 2. Set up a payer agent

```typescript
import { AeeronClient } from "@aeeron/sdk";
import { Keypair, Connection } from "@solana/web3.js";

// Load your wallet (never hardcode in production)
const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(process.env.WALLET_KEYPAIR!))
);

const client = new AeeronClient({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  payer,
  defaultToken: "SOL",
});

// Fetch a paid resource — automatically handles 402 → pay → retry
const response = await client.fetchWithPayment(
  "https://api.example.com/premium/data"
);

if (response.ok) {
  const data = await response.json();
  console.log("Got paid data:", data);
}
```

---

## 3. Set up a resource server

```typescript
import express from "express";
import { AeeronMiddleware } from "@aeeron/sdk/server";

const app = express();

// Gate the /premium route behind a 0.001 SOL payment
app.use(
  "/premium",
  AeeronMiddleware({
    payee: "YourWalletAddress44chars...",
    amount: 1_000_000, // lamports (0.001 SOL)
    token: "SOL",
    network: "mainnet-beta",
  })
);

app.get("/premium/data", (req, res) => {
  // req.aeeronPayment.payer — the payer's wallet address
  // req.aeeronPayment.txHash — the settlement transaction
  res.json({
    message: "You paid for this!",
    payer: (req as any).aeeronPayment.payer,
  });
});

app.listen(3000);
```

---

## 4. Use USDC instead of SOL

```typescript
import { SUPPORTED_TOKENS } from "@aeeron/sdk";

// Payer
const client = new AeeronClient({ connection, payer, defaultToken: "USDC" });

// Resource server
AeeronMiddleware({
  payee: "YourWallet...",
  amount: 1_000_000, // 1.0 USDC (6 decimals)
  token: SUPPORTED_TOKENS.USDC,
});
```

---

## 5. Open a payment channel (optional)

Channels are ideal for repeated micro-payments to the same payee.

```typescript
import { PublicKey } from "@solana/web3.js";

const payee = new PublicKey("PayeeWalletAddress...");

// Open a channel with 0.1 SOL initial collateral
const { channelAddress } = await client.openChannel(
  payee,
  100_000_000 // 0.1 SOL in lamports
);

console.log("Channel opened at:", channelAddress.toBase58());

// The client automatically uses the channel for subsequent payments
// to the same payee when one is open.

// Close the channel when done
await client.closeChannel(payee);
```

---

## Next Steps

- [Protocol Specification](./x402-specification.md)
- [API Reference](https://docs.aeeron.xyz/api)
- [Example: AI Agent with Paid Tools](./examples/ai-agent.md)
- [Example: Streaming Micropayments](./examples/streaming.md)
