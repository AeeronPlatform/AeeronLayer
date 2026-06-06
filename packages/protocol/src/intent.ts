import { createHmac } from 'crypto';
  import { AEERON_MINT, X402_PROTOCOL_VERSION } from './constants';

  /**
   * PaymentIntent
   *
   * A signed, pre-authorized payment declaration that an agent (payer) submits
   * before a capability call. The Gateway validates and executes the intent
   * atomically, preventing double-spend and enabling MEV-resistant ordering.
   *
   * Lifecycle:
   *   pending → authorized → settled | expired | cancelled
   */

  export type IntentStatus = 'pending' | 'authorized' | 'settled' | 'expired' | 'cancelled';

  export type PaymentRail = 'sol' | 'spl' | 'channel';

  export interface PaymentIntent {
    /** Unique intent identifier (UUIDv4). */
    intentId:        string;
    /** x402 protocol version. */
    protocolVersion: string;
    /** Paying agent wallet (base58). */
    payer:           string;
    /** Receiving agent wallet (base58). */
    recipient:       string;
    /** Target agent identifier. */
    agentId:         string;
    /** Capability to invoke upon settlement. */
    capability:      string;
    /** Maximum amount the payer authorizes (lamports, as string). */
    maxAmountLamports: string;
    /** Payment rail: native SOL, SPL token, or pre-opened channel. */
    rail:            PaymentRail;
    /** SPL token mint — only set when rail = "spl". */
    mint?:           string;
    /** Existing channel ID — only set when rail = "channel". */
    channelId?:      string;
    /** Unix ms — intent must be settled before this timestamp. */
    expiresAt:       number;
    /** Idempotency key set by the payer to prevent duplicate execution. */
    nonce:           string;
    /** JSON-serialized capability payload (included in signature). */
    payloadHash:     string;
    /** HMAC-SHA256 over canonical fields, keyed with payer's session token. */
    signature:       string;
    /** Gateway-assigned status (not set by client). */
    status?:         IntentStatus;
  }

  // ─── Builder ──────────────────────────────────────────────────────────────────

  /**
   * IntentBuilder
   *
   * Fluent constructor for PaymentIntent objects.
   *
   * Usage:
   *   const intent = new IntentBuilder()
   *     .payer(keypair.publicKey.toBase58())
   *     .recipient(agent.wallet)
   *     .agent(agent.agentId)
   *     .capability('summarize', payload)
   *     .maxAmount(100_000n)
   *     .rail('sol')
   *     .ttl(30_000)
   *     .build(sessionToken);
   */
  export class IntentBuilder {
    private fields: Partial<Omit<PaymentIntent, 'intentId' | 'signature' | 'protocolVersion'>> = {};

    payer(wallet: string): this {
      this.fields.payer = wallet;
      return this;
    }

    recipient(wallet: string): this {
      this.fields.recipient = wallet;
      return this;
    }

    agent(agentId: string): this {
      this.fields.agentId = agentId;
      return this;
    }

    capability(name: string, payload: Record<string, unknown> = {}): this {
      this.fields.capability  = name;
      this.fields.payloadHash = hashPayload(payload);
      return this;
    }

    maxAmount(lamports: bigint): this {
      this.fields.maxAmountLamports = lamports.toString();
      return this;
    }

    rail(r: PaymentRail, opts?: { mint?: string; channelId?: string }): this {
      this.fields.rail      = r;
      this.fields.mint      = r === 'spl' ? (opts?.mint ?? AEERON_MINT) : undefined;
      this.fields.channelId = r === 'channel' ? opts?.channelId : undefined;
      return this;
    }

    /** TTL in milliseconds from now (default: 30_000). */
    ttl(ms = 30_000): this {
      this.fields.expiresAt = Date.now() + ms;
      return this;
    }

    build(sessionToken: string): PaymentIntent {
      const required: Array<keyof typeof this.fields> = [
        'payer', 'recipient', 'agentId', 'capability',
        'maxAmountLamports', 'rail', 'payloadHash',
      ];
      for (const k of required) {
        if (!this.fields[k]) throw new Error(`IntentBuilder: missing field "${k}"`);
      }
      if (!this.fields.expiresAt) this.ttl();

      const partial: Omit<PaymentIntent, 'intentId' | 'signature'> = {
        protocolVersion:   X402_PROTOCOL_VERSION,
        payer:             this.fields.payer!,
        recipient:         this.fields.recipient!,
        agentId:           this.fields.agentId!,
        capability:        this.fields.capability!,
        maxAmountLamports: this.fields.maxAmountLamports!,
        rail:              this.fields.rail!,
        mint:              this.fields.mint,
        channelId:         this.fields.channelId,
        expiresAt:         this.fields.expiresAt!,
        nonce:             crypto.randomUUID(),
        payloadHash:       this.fields.payloadHash!,
      };

      return {
        intentId:  crypto.randomUUID(),
        ...partial,
        signature: signIntent(partial, sessionToken),
      };
    }
  }

  // ─── Verification ─────────────────────────────────────────────────────────────

  export type VerifyIntentResult =
    | { ok: true;  intent: PaymentIntent }
    | { ok: false; error: string };

  /**
   * verifyIntent
   *
   * Validates signature, expiry, and amount ceiling of a PaymentIntent.
   * Called by the Gateway before authorising the payment.
   */
  export function verifyIntent(
    intent: PaymentIntent,
    sessionToken: string,
    opts: { maxAmountLamports?: bigint } = {},
  ): VerifyIntentResult {
    // Expiry
    if (Date.now() > intent.expiresAt) {
      return { ok: false, error: 'intent expired' };
    }

    // Amount ceiling
    if (opts.maxAmountLamports !== undefined) {
      if (BigInt(intent.maxAmountLamports) > opts.maxAmountLamports) {
        return { ok: false, error: 'intent exceeds allowed maxAmountLamports' };
      }
    }

    // Signature
    const { intentId: _id, signature: _sig, status: _st, ...rest } = intent as PaymentIntent & { status?: IntentStatus };
    const expected = signIntent(rest as Omit<PaymentIntent, 'intentId' | 'signature'>, sessionToken);
    if (!timingSafeEqual(expected, intent.signature)) {
      return { ok: false, error: 'invalid intent signature' };
    }

    return { ok: true, intent };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function canonicalIntent(intent: Omit<PaymentIntent, 'intentId' | 'signature'>): string {
    return [
      intent.protocolVersion,
      intent.payer,
      intent.recipient,
      intent.agentId,
      intent.capability,
      intent.maxAmountLamports,
      intent.rail,
      intent.mint       ?? '',
      intent.channelId  ?? '',
      intent.expiresAt.toString(),
      intent.nonce,
      intent.payloadHash,
    ].join('|');
  }

  function signIntent(
    intent: Omit<PaymentIntent, 'intentId' | 'signature'>,
    key: string,
  ): string {
    return createHmac('sha256', key).update(canonicalIntent(intent)).digest('hex');
  }

  function hashPayload(payload: Record<string, unknown>): string {
    const { createHash } = require('crypto');
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  function timingSafeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, 'hex');
    const bBuf = Buffer.from(b, 'hex');
    if (aBuf.length !== bBuf.length) return false;
    let diff = 0;
    for (let i = 0; i < aBuf.length; i++) diff |= aBuf[i] ^ bBuf[i];
    return diff === 0;
  }
  