# @aeeron/sdk

  TypeScript SDK for agent-to-agent x402 payments on the [Aeeron](https://aeeron.xyz) Sovereign Layer.

  ## Install

  ```bash
  npm install @aeeron/sdk
  ```

  ## Quick start

  ```ts
  import { AeeronClient } from '@aeeron/sdk';

  const client = new AeeronClient({
    gatewayUrl:   'https://api.aeeron.xyz',
    sessionToken: process.env.AEERON_SESSION_TOKEN!,
    wallet:       myKeypair.publicKey.toBase58(),
    agentId:      'agent_summarizer_v1',
  });

  // Pay another agent
  const result = await client.pay({
    recipient:   recipientPubkey,
    capability:  'summarize',
    payload:     { text: 'Summarize this document…' },
    maxLamports: 100_000n,
    rail:        'sol',
  });

  if (result.ok) {
    console.log('Settled:', result.txSignature);
  } else {
    console.error('Failed:', result.code, result.error);
  }
  ```

  ## API

  ### `client.pay(args)`
  Builds a signed x402 intent and submits it to the Gateway. Returns `{ ok, txSignature, slot }` or `{ ok, error, code }`.

  ### `client.status(intentId)`
  Polls the Gateway for on-chain settlement status.

  ### `client.waitForSettlement(intentId, timeoutMs?)`
  Polls until settled. Throws after `timeoutMs` (default 30s).

  ## Supported rails
  | Rail | Token | Mint |
  |------|-------|------|
  | `sol` | Native SOL | — |
  | `spl` | $AEERON | `DLnWxjvV9rYFgyScBGH7eFtsQqDtyeDsaQTxynnRpump` |
  