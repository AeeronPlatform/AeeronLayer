import { createHash } from 'crypto';

  /**
   * x402 Payment Proof
   *
   * Issued by the Aeeron Gateway after a successful on-chain settlement.
   * Agents verify this before fulfilling a request.
   */
  export interface PaymentProof {
    /** Solana transaction signature (base58). */
    txSignature: string;
    /** Paying wallet address (base58). */
    payer: string;
    /** Receiving agent wallet address (base58). */
    recipient: string;
    /** Amount transferred in lamports (string to survive JSON round-trip). */
    amountLamports: string;
    /** SPL token mint; null for native SOL. */
    mint: string | null;
    /** Unix timestamp (ms) when the settlement was confirmed. */
    settledAt: number;
    /** Aeeron Gateway nonce — prevents proof replay. */
    nonce: string;
    /** HMAC-SHA256 of the canonical payload, keyed with the gateway secret. */
    signature: string;
  }

  export type VerifyResult =
    | { ok: true;  proof: PaymentProof }
    | { ok: false; error: string };

  /**
   * Canonical serialisation for HMAC computation.
   * Field order is fixed — any change breaks existing proofs.
   */
  function canonicalPayload(p: Omit<PaymentProof, 'signature'>): string {
    return [
      p.txSignature,
      p.payer,
      p.recipient,
      p.amountLamports,
      p.mint ?? 'SOL',
      p.settledAt.toString(),
      p.nonce,
    ].join('|');
  }

  /**
   * verifyPaymentProof
   *
   * Validates authenticity and freshness of an Aeeron payment proof.
   * Agents call this before fulfilling a paid request.
   *
   *   const result = await verifyPaymentProof(proof, {
   *     gatewaySecret: process.env.AEERON_GATEWAY_SECRET!,
   *     maxAgeMs: 30_000,
   *   });
   *   if (!result.ok) throw new Error(result.error);
   */
  export async function verifyPaymentProof(
    proof: PaymentProof,
    opts: {
      gatewaySecret: string;
      /** Max age of the proof in ms (default: 60 s). */
      maxAgeMs?: number;
      /** Minimum required payment in lamports. */
      minAmountLamports?: bigint;
    },
  ): Promise<VerifyResult> {
    const { gatewaySecret, maxAgeMs = 60_000, minAmountLamports } = opts;

    // 1. Freshness
    const age = Date.now() - proof.settledAt;
    if (age < 0)       return { ok: false, error: 'proof timestamp is in the future' };
    if (age > maxAgeMs) return { ok: false, error: `proof expired (age ${age}ms > ${maxAgeMs}ms)` };

    // 2. Amount
    if (minAmountLamports !== undefined) {
      const paid = BigInt(proof.amountLamports);
      if (paid < minAmountLamports) {
        return { ok: false, error: `insufficient payment: ${paid} < ${minAmountLamports}` };
      }
    }

    // 3. HMAC integrity
    const { createHmac } = await import('crypto');
    const payload   = canonicalPayload(proof);
    const expected  = createHmac('sha256', gatewaySecret).update(payload).digest('hex');

    // Constant-time compare
    const expBuf = Buffer.from(expected, 'hex');
    const gotBuf = Buffer.from(proof.signature, 'hex');
    if (expBuf.length !== gotBuf.length) {
      return { ok: false, error: 'invalid proof signature' };
    }
    let diff = 0;
    for (let i = 0; i < expBuf.length; i++) diff |= expBuf[i] ^ gotBuf[i];
    if (diff !== 0) return { ok: false, error: 'invalid proof signature' };

    return { ok: true, proof };
  }

  /**
   * buildPaymentProof
   *
   * Called by the Aeeron Gateway after settlement.
   * Agents should NOT call this — use verifyPaymentProof instead.
   */
  export function buildPaymentProof(
    params: Omit<PaymentProof, 'signature'>,
    gatewaySecret: string,
  ): PaymentProof {
    const { createHmac } = require('crypto');
    const payload   = canonicalPayload(params);
    const signature = createHmac('sha256', gatewaySecret).update(payload).digest('hex');
    return { ...params, signature };
  }
  