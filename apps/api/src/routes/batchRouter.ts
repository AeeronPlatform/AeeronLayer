import { Router, type Request, type Response } from 'express';
  import { z }                     from 'zod/v4';
  import { verifyBatchIntent }     from '@aeeron/protocol';
  import { SettlementService }     from '../settlement/SettlementService';

  const router = Router();
  const settlement = new SettlementService();
  const SESSION_TOKEN = process.env.SESSION_TOKEN!;

  const BatchLegSchema = z.object({
    intentId:         z.string().uuid(),
    recipient:        z.string().min(32).max(44),
    agentId:          z.string().min(1),
    capability:       z.string().min(1),
    payload:          z.record(z.unknown()).optional(),
    maxAmountLamports: z.string().regex(/^\d+$/),
    rail:             z.enum(['sol', 'spl']),
    mint:             z.string().optional(),
  });

  const BatchIntentSchema = z.object({
    batchId:       z.string().uuid(),
    nonce:         z.string().uuid(),
    payer:         z.string().min(32).max(44),
    legs:          z.array(BatchLegSchema).min(1).max(8),
    totalLamports: z.string().regex(/^\d+$/),
    expiresAt:     z.number().int().positive(),
    createdAt:     z.number().int().positive(),
    signature:     z.string().length(64),
    payloadHash:   z.string().length(64),
  });

  /**
   * POST /api/gateway/batch
   *
   * Accepts a BatchIntent (up to 8 legs) and settles each leg sequentially.
   * All legs are verified atomically before any settlement begins.
   * If any leg fails, already-settled legs are NOT rolled back (on-chain finality).
   * The response includes per-leg results so the caller can reconcile.
   */
  router.post('/batch', async (req: Request, res: Response) => {
    const parsed = BatchIntentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid batch intent', issues: parsed.error.issues });
      return;
    }

    const batch = parsed.data;

    // Verify batch HMAC
    const check = verifyBatchIntent(batch, SESSION_TOKEN);
    if (!check.ok) {
      res.status(400).json({ error: check.error, code: 'BATCH_INVALID' });
      return;
    }

    // Settle each leg sequentially
    const results = [];
    let allOk = true;

    for (const leg of batch.legs) {
      const result = await settlement.settle({
        intentId:        leg.intentId,
        payer:           batch.payer,
        recipient:       leg.recipient,
        agentId:         leg.agentId,
        capability:      leg.capability,
        maxAmountLamports: BigInt(leg.maxAmountLamports),
        rail:            leg.rail,
        expiresAt:       batch.expiresAt,
        nonce:           batch.nonce,
        payloadHash:     batch.payloadHash,
        signature:       batch.signature,
      });

      results.push({ intentId: leg.intentId, agentId: leg.agentId, ...result });
      if (!result.ok) allOk = false;
    }

    res.status(allOk ? 200 : 207).json({
      batchId:  batch.batchId,
      allOk,
      settled:  results.filter((r) => r.ok).length,
      failed:   results.filter((r) => !r.ok).length,
      results,
    });
  });

  export default router;
  