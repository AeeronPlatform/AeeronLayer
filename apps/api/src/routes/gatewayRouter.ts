import { Router, type Request, type Response } from 'express';
  import { z }                    from 'zod/v4';
  import { IntentBuilder }        from '@aeeron/protocol';
  import { SettlementService }    from '../settlement/SettlementService';
  import { logger }               from '../logger';

  const router = Router();
  const settlement = new SettlementService();

  /**
   * x402 payment header schema
   * Browsers / agent SDKs attach this after receiving a 402 response.
   */
  const X402Header = z.object({
    intentId:        z.string().uuid(),
    payer:           z.string().min(32).max(44),
    recipient:       z.string().min(32).max(44),
    agentId:         z.string().min(1),
    capability:      z.string().min(1),
    maxAmountLamports: z.string().regex(/^\d+$/),
    rail:            z.enum(['sol', 'spl']),
    expiresAt:       z.coerce.number().int().positive(),
    nonce:           z.string().uuid(),
    payloadHash:     z.string().length(64),
    signature:       z.string().length(64),
    mint:            z.string().optional(),
  });

  /**
   * POST /api/gateway/pay
   *
   * Entry point for x402 agent-to-agent payments.
   * Validates the X-402-Payment header, settles on-chain via SettlementService,
   * and returns 200 with txSignature or 402/400/500 on failure.
   */
  router.post('/pay', async (req: Request, res: Response) => {
    const raw = req.headers['x-402-payment'];
    if (!raw || typeof raw !== 'string') {
      res.status(402).json({ error: 'Missing X-402-Payment header', code: 'HEADER_MISSING' });
      return;
    }

    let parsed: ReturnType<typeof X402Header.safeParse>;
    try {
      parsed = X402Header.safeParse(JSON.parse(raw));
    } catch {
      res.status(400).json({ error: 'Malformed X-402-Payment header', code: 'HEADER_INVALID' });
      return;
    }

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payment header fields', issues: parsed.error.issues });
      return;
    }

    const intent = parsed.data;
    const result = await settlement.settle({
      ...intent,
      maxAmountLamports: BigInt(intent.maxAmountLamports),
    });

    if (result.ok) {
      res.status(200).json({ settled: true, txSignature: result.txSignature, slot: result.slot });
    } else {
      const status = result.code === 'INTENT_INVALID' || result.code === 'INTENT_EXPIRED' ? 400 : 500;
      res.status(status).json({ settled: false, error: result.error, code: result.code });
    }
  });

  /**
   * GET /api/gateway/status/:intentId
   *
   * Returns settlement status for a given intentId.
   * Agents poll this after sending payment to confirm on-chain finality.
   */
  router.get('/status/:intentId', async (req: Request, res: Response) => {
    const { intentId } = req.params;
    if (!intentId || intentId.length !== 36) {
      res.status(400).json({ error: 'Invalid intentId' });
      return;
    }

    try {
      // Fetch PaymentRecord from DB (populated by on-chain indexer)
      const record = await import('../db').then(({ db }) =>
        db.query.paymentRecords.findFirst({
          where: (r, { eq }) => eq(r.intentId, intentId),
        })
      );

      if (!record) {
        res.status(404).json({ settled: false, intentId });
        return;
      }

      res.status(200).json({ settled: true, intentId, txSignature: record.txSignature, slot: record.slot, settledAt: record.settledAt });
    } catch (err) {
      req.log.error({ err, intentId }, 'gateway: status lookup failed');
      res.status(500).json({ error: 'Internal error' });
    }
  });

  export default router;
  