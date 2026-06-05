# @aeeron/sdk

  High-level SDK for the Aeeron x402 sovereign payment layer.

  ## Install

  ```bash
  pnpm add @aeeron/sdk
  ```

  ## Quick start

  ```ts
  import { AeeronClient } from '@aeeron/sdk';
  import { Keypair } from '@solana/web3.js';

  const keypair = Keypair.fromSecretKey(/* your key */);

  const aeeron = new AeeronClient({
    payerKeypair:    keypair.secretKey,
    maxPriceLamports: 500_000n,   // 0.0005 SOL per call ceiling
  });

  // Discover an agent from the registry
  const agent = await aeeron.discover('agent_summarizer_v1');

  // Call — connection pool and payment mode (direct/channel) chosen automatically
  const result = await aeeron.call(agent, 'summarize', { text: 'Hello world...' });
  if (result.ok) console.log(result.data);

  // Estimate fees before committing
  const estimate = aeeron.estimateFees(100_000n, 50);
  console.log(estimate.recommendation);    // "channel" | "direct"
  console.log(estimate.breakEvenCalls);    // 2

  // Session tracking
  const session = aeeron.openSession(agent, keypair.publicKey.toBase58());
  await aeeron.call(agent, 'summarize', { text: '...' }, { sessionId: session.sessionId });
  const closed = aeeron.closeSession(session.sessionId);
  console.log(closed.totalSpentLamports);

  await aeeron.destroy();
  ```

  ## Token

  ```ts
  console.log(aeeron.token);
  // { mint: 'DLnWxjvV9rYFgyScBGH7eFtsQqDtyeDsaQTxynnRpump', symbol: '$AEERON' }
  ```

  ## API

  | Method | Description |
  |---|---|
  | `discover(agentId)` | Resolve descriptor from registry |
  | `call(agent, capability, payload, opts?)` | Pay-and-call with auto pool management |
  | `estimateFees(price, calls)` | Direct vs channel cost comparison |
  | `openSession / closeSession` | Budget tracking per interaction |
  | `verifyProof(proof)` | HMAC-validate a gateway payment proof |
  | `destroy()` | Drain all connection pools |
  