import { Router } from 'express';
  import { z } from 'zod';
  import { validateBody } from '../middleware/validateBody';
  import { PaymentVerifier } from '@aeeron/sdk/server';
  import { X402Codec } from '@aeeron/sdk';
  import { connection } from '../lib/solana';

  export const acceptRouter = Router();

  const verifier = new PaymentVerifier({ connection, skipVerification: process.env.SKIP_VERIFICATION === 'true' });

  // ─── POST /v1/accept/payment ──────────────────────────────────────────────────
  // Verify an inbound x402 proof and return a signed receipt.
  // Resource servers call this instead of running verification themselves.

  const AcceptPaymentBody = z.object({
    proofHeader:   z.string().min(1),
    detailsHeader: z.string().min(1),
    resource:      z.string().url().optional(),
  });

  acceptRouter.post(
    '/payment',
    validateBody(AcceptPaymentBody),
    async (req, res, next) => {
      try {
        const { proofHeader, detailsHeader, resource } = req.body as z.infer<typeof AcceptPaymentBody>;

        const details = X402Codec.decodePaymentDetails(detailsHeader);
        const proof   = X402Codec.decodePaymentProof(proofHeader);

        const result = await verifier.verify(proof, details);

        if (!result.valid) {
          return res.status(402).json({
            accepted: false,
            error: result.reason,
            code:  result.code ?? 'PROOF_INVALID',
          });
        }

        res.json({
          accepted:   true,
          txHash:     proof.txHash,
          payer:      proof.payer,
          payee:      details.payee,
          amount:     details.amount.toString(),
          mint:       details.mint,
          settledAt:  new Date().toISOString(),
          resource,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─── POST /v1/accept/batch ────────────────────────────────────────────────────
  // Verify up to 50 proofs in one request (bulk ingestion for high-throughput servers).

  const BatchBody = z.object({
    payments: z.array(z.object({
      id:            z.string(),
      proofHeader:   z.string().min(1),
      detailsHeader: z.string().min(1),
    })).min(1).max(50),
  });

  acceptRouter.post(
    '/batch',
    validateBody(BatchBody),
    async (req, res, next) => {
      try {
        const { payments } = req.body as z.infer<typeof BatchBody>;

        const results = await Promise.allSettled(
          payments.map(async (p) => {
            const details = X402Codec.decodePaymentDetails(p.detailsHeader);
            const proof   = X402Codec.decodePaymentProof(p.proofHeader);
            const result  = await verifier.verify(proof, details);
            return { id: p.id, ...result };
          }),
        );

        const response = results.map((r, i) => {
          if (r.status === 'fulfilled') return { id: payments[i].id, ...r.value };
          return { id: payments[i].id, valid: false, reason: r.reason?.message ?? 'unknown' };
        });

        const accepted = response.filter((r) => r.valid).length;
        res.json({ total: payments.length, accepted, rejected: payments.length - accepted, results: response });
      } catch (err) {
        next(err);
      }
    },
  );

  // ─── GET /v1/accept/status/:txHash ───────────────────────────────────────────
  // Quick check: has this tx hash already been accepted (nonce used)?

  acceptRouter.get('/status/:txHash', async (req, res, next) => {
    try {
      const { txHash } = req.params;
      if (!txHash || txHash.length < 40) return res.status(400).json({ error: 'invalid txHash' });

      const tx = await connection.getTransaction(txHash, { maxSupportedTransactionVersion: 0 });
      if (!tx) return res.json({ status: 'not_found', txHash });

      const confirmed = (tx.slot ?? 0) > 0;
      res.json({
        status:      confirmed ? 'confirmed' : 'pending',
        txHash,
        slot:        tx.slot,
        blockTime:   tx.blockTime,
        err:         tx.meta?.err ?? null,
      });
    } catch (err) {
      next(err);
    }
  });
  