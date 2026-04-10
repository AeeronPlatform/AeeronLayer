export function DocsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-base font-semibold text-white">Protocol Reference</h2>
        <p className="text-xs text-[#4b5080] mt-0.5">x402 payment protocol specification for Aeeron on Solana</p>
      </div>

      {[
        {
          title: "Payment Flow",
          content: `The x402 payment protocol enables agents to pay for HTTP resources autonomously.

1. Agent sends a request to a protected resource
2. Server responds with 402 Payment Required + X-Payment-Details header
3. Agent decodes the payment details (payee, amount, nonce, expiry)
4. Agent builds and signs a Solana transaction using @aeeron/sdk
5. Agent retries the request with X-Payment-Proof header
6. Server verifies the proof on-chain and returns 200 OK`,
        },
        {
          title: "X-Payment-Details Header",
          content: `base64(JSON) where JSON contains:

{
  "payee":   "SolanaAddress...",   // Recipient wallet
  "amount":  1000000,              // Lamports (SOL) or base units (SPL)
  "token":   "SOL",                // "SOL" or USDC mint address
  "nonce":   "hex64chars...",      // 32-byte random nonce
  "expiry":  1735689600,           // Unix timestamp
  "network": "mainnet-beta",
  "version": 1
}`,
        },
        {
          title: "X-Payment-Proof Header",
          content: `base64(JSON) where JSON contains:

{
  "signature": "base58...",    // Ed25519 sig over canonical message
  "txHash":    "base58...",    // Confirmed Solana transaction
  "nonce":     "hex64chars",   // Must match the nonce from details
  "timestamp": 1735689300      // Unix timestamp of proof creation
}`,
        },
        {
          title: "Payment Channels",
          content: `Channels reduce per-request overhead for high-frequency agent interactions.

- Payer deposits collateral into an on-chain escrow vault
- Payee claims settlements against the vault via signed proofs
- Nonce registry prevents replay attacks across all settlements
- Payer can close the channel and reclaim unspent collateral at any time`,
        },
        {
          title: "SDK Usage (Payer)",
          content: `import { AeeronClient } from "@aeeron/sdk";
import { Keypair, Connection } from "@solana/web3.js";

const client = new AeeronClient({
  connection: new Connection("https://api.mainnet-beta.solana.com"),
  payer: Keypair.fromSecretKey(mySecretKey),
});

// Automatically handles 402 → pay → retry
const response = await client.fetchWithPayment("https://api.example.com/data");
const data = await response.json();`,
        },
        {
          title: "SDK Usage (Resource Server)",
          content: `import { AeeronMiddleware } from "@aeeron/sdk/server";
import express from "express";

const app = express();

app.use(
  "/premium",
  AeeronMiddleware({
    payee: "YourWalletAddress...",
    amount: 1_000_000,        // 0.001 SOL in lamports
    token: "SOL",
    network: "mainnet-beta",
  })
);

app.get("/premium/data", (req, res) => {
  res.json({ message: "paid content", payer: req.aeeronPayment.payer });
});`,
        },
      ].map(({ title, content }) => (
        <div key={title} className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e2e]">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <pre className="px-5 py-4 text-xs font-mono text-[#8b90b0] overflow-x-auto whitespace-pre-wrap leading-relaxed">
            {content}
          </pre>
        </div>
      ))}
    </div>
  );
}
