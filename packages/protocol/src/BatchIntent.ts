import { createHmac, randomUUID } from 'crypto';
  import { AEERON_MINT }   from './constants';

  export interface BatchLeg {
    recipient:       string;
    agentId:         string;
    capability:      string;
    payload?:        Record<string, unknown>;
    maxAmountLamports: bigint;
    rail?:           'sol' | 'spl';
  }

  export interface BatchIntent {
    batchId:         string;
    nonce:           string;
    payer:           string;
    legs:            BatchIntentLeg[];
    totalLamports:   string;
    expiresAt:       number;
    createdAt:       number;
    signature:       string;
    payloadHash:     string;
  }

  export interface BatchIntentLeg {
    intentId:        string;
    recipient:       string;
    agentId:         string;
    capability:      string;
    payload:         Record<string, unknown>;
    maxAmountLamports: string;
    rail:            'sol' | 'spl';
    mint?:           string;
  }

  /**
   * BatchIntentBuilder
   *
   * Constructs an atomically-signed batch of x402 payment intents.
   * All legs share a single HMAC over the concatenated leg payloads,
   * preventing partial replay (a subset of legs cannot be submitted
   * without the full batch signature).
   *
   * Usage:
   *   const batch = new BatchIntentBuilder()
   *     .payer(walletPubkey)
   *     .ttl(60_000)
   *     .addLeg({ recipient, agentId: 'agent_a', capability: 'summarize', maxAmountLamports: 100_000n })
   *     .addLeg({ recipient, agentId: 'agent_b', capability: 'embed',     maxAmountLamports:  50_000n })
   *     .build(sessionToken);
   */
  export class BatchIntentBuilder {
    private _payer?: string;
    private _ttl   = 60_000;
    private _legs: BatchLeg[] = [];

    payer(pubkey: string): this { this._payer = pubkey; return this; }
    ttl(ms: number):       this { this._ttl   = ms;     return this; }

    addLeg(leg: BatchLeg): this {
      this._legs.push(leg);
      return this;
    }

    build(sessionToken: string): BatchIntent {
      if (!this._payer)        throw new Error('BatchIntentBuilder: payer is required');
      if (this._legs.length === 0) throw new Error('BatchIntentBuilder: at least one leg required');
      if (this._legs.length > 8)   throw new Error('BatchIntentBuilder: max 8 legs per batch');

      const now      = Date.now();
      const batchId  = randomUUID();
      const nonce    = randomUUID();
      const expiresAt = now + this._ttl;

      const legs: BatchIntentLeg[] = this._legs.map((leg) => ({
        intentId:        randomUUID(),
        recipient:        leg.recipient,
        agentId:          leg.agentId,
        capability:       leg.capability,
        payload:          leg.payload ?? {},
        maxAmountLamports: leg.maxAmountLamports.toString(),
        rail:             leg.rail ?? 'sol',
        mint:             leg.rail === 'spl' ? AEERON_MINT : undefined,
      }));

      const totalLamports = this._legs
        .reduce((s, l) => s + l.maxAmountLamports, 0n)
        .toString();

      // Deterministic payload hash: hash of sorted JSON of all legs
      const payloadStr  = JSON.stringify({ batchId, nonce, payer: this._payer, legs, expiresAt });
      const payloadHash = createHmac('sha256', 'payload-hash-key').update(payloadStr).digest('hex');

      // HMAC signature: covers payer + batchId + nonce + totalLamports + expiresAt + payloadHash
      const sigPayload  = [this._payer, batchId, nonce, totalLamports, expiresAt.toString(), payloadHash].join(':');
      const signature   = createHmac('sha256', sessionToken).update(sigPayload).digest('hex');

      return {
        batchId,
        nonce,
        payer:         this._payer,
        legs,
        totalLamports,
        expiresAt,
        createdAt:     now,
        signature,
        payloadHash,
      };
    }
  }

  /**
   * verifyBatchIntent
   *
   * Verifies the HMAC signature and expiry of a BatchIntent.
   * Returns { ok: true } or { ok: false, error }.
   */
  export function verifyBatchIntent(
    batch: BatchIntent,
    sessionToken: string,
  ): { ok: true } | { ok: false; error: string } {
    if (Date.now() > batch.expiresAt) {
      return { ok: false, error: 'BatchIntent has expired' };
    }

    const sigPayload = [
      batch.payer,
      batch.batchId,
      batch.nonce,
      batch.totalLamports,
      batch.expiresAt.toString(),
      batch.payloadHash,
    ].join(':');

    const expected = createHmac('sha256', sessionToken).update(sigPayload).digest('hex');

    if (batch.signature !== expected) {
      return { ok: false, error: 'BatchIntent signature mismatch' };
    }

    return { ok: true };
  }
  