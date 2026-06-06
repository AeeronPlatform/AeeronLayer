import { Router } from 'express';
  import { z } from 'zod';
  import { validateBody } from '../middleware/validateBody';
  import { verifyIntent, type PaymentIntent, type IntentStatus } from '@aeeron/protocol';
  import { eventBus } from '../events/EventBus';

  export const intentsRouter = Router();

  const store = new Map<string, PaymentIntent>();

  const IntentBody = z.object({
    intentId:          z.string().uuid(),
    protocolVersion:   z.string(),
    payer:             z.string().length(44),
    recipient:         z.string().length(44),
    agentId:           z.string().min(1),
    capability:        z.string().min(1),
    maxAmountLamports: z.string().regex(/^\d+$/),
    rail:              z.enum(['sol', 'spl', 'channel']),
    mint:              z.string().optional(),
    channelId:         z.string().optional(),
    expiresAt:         z.number().int(),
    nonce:             z.string().uuid(),
    payloadHash:       z.string().length(64),
    signature:         z.string().length(64),
  });

  // ─── POST /v1/intents — submit a payment intent ───────────────────────────────
  intentsRouter.post('/', validateBody(IntentBody), (req, res) => {
    const intent = req.body as PaymentIntent;

    // Verify via session token forwarded in header
    const sessionToken = req.headers['x-session-token'] as string | undefined;
    if (!sessionToken) return res.status(401).json({ error: 'x-session-token header required' });

    const result = verifyIntent(intent, sessionToken, {
      maxAmountLamports: BigInt(10_000_000), // gateway ceiling: 0.01 SOL
    });

    if (!result.ok) return res.status(400).json({ error: result.error });

    const record: PaymentIntent = { ...intent, status: 'authorized' };
    store.set(intent.intentId, record);

    eventBus.emit('payment.settled', {
      intentId: intent.intentId,
      agentId:  intent.agentId,
      amountLamports: intent.maxAmountLamports,
      rail: intent.rail,
    }, intent.agentId);

    res.status(201).json({ intentId: intent.intentId, status: 'authorized' });
  });

  // ─── GET /v1/intents/:id ─────────────────────────────────────────────────────
  intentsRouter.get('/:id', (req, res) => {
    const record = store.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'intent not found' });
    res.json(record);
  });

  // ─── DELETE /v1/intents/:id — cancel a pending intent ────────────────────────
  intentsRouter.delete('/:id', (req, res) => {
    const record = store.get(req.params.id);
    if (!record) return res.status(404).json({ error: 'intent not found' });
    if (record.status === 'settled') return res.status(409).json({ error: 'intent already settled' });
    record.status = 'cancelled' as IntentStatus;
    res.json({ intentId: record.intentId, status: 'cancelled' });
  });
  