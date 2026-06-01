import { Router } from 'express';
  import { z } from 'zod';
  import { validateBody } from '../middleware/validateBody';
  import { registerEndpoint, getEndpoint, listEndpoints, removeEndpoint } from '../lib/webhook';

  export const webhooksRouter = Router();

  const VALID_EVENTS = [
    'payment.accepted',
    'payment.rejected',
    'channel.opened',
    'channel.settled',
    'channel.closed',
  ] as const;

  // ─── POST /v1/webhooks ────────────────────────────────────────────────────────
  const RegisterBody = z.object({
    url:    z.string().url(),
    secret: z.string().min(16).max(256),
    events: z.array(z.enum(VALID_EVENTS)).min(1),
  });

  webhooksRouter.post('/', validateBody(RegisterBody), (req, res) => {
    const { url, secret, events } = req.body as z.infer<typeof RegisterBody>;
    const ep = registerEndpoint(url, secret, events);
    res.status(201).json({
      id:        ep.id,
      url:       ep.url,
      events:    ep.events,
      createdAt: ep.createdAt,
    });
  });

  // ─── GET /v1/webhooks ─────────────────────────────────────────────────────────
  webhooksRouter.get('/', (_req, res) => {
    const list = listEndpoints().map(({ id, url, events, createdAt }) => ({
      id, url, events, createdAt,
    }));
    res.json({ endpoints: list, total: list.length });
  });

  // ─── GET /v1/webhooks/:id ─────────────────────────────────────────────────────
  webhooksRouter.get('/:id', (req, res) => {
    const ep = getEndpoint(req.params.id);
    if (!ep) return res.status(404).json({ error: 'webhook not found' });
    const { id, url, events, createdAt } = ep;
    res.json({ id, url, events, createdAt });
  });

  // ─── DELETE /v1/webhooks/:id ──────────────────────────────────────────────────
  webhooksRouter.delete('/:id', (req, res) => {
    const removed = removeEndpoint(req.params.id);
    if (!removed) return res.status(404).json({ error: 'webhook not found' });
    res.status(204).send();
  });

  // ─── POST /v1/webhooks/:id/test ───────────────────────────────────────────────
  // Send a synthetic payment.accepted event to verify the endpoint is reachable.
  webhooksRouter.post('/:id/test', async (req, res, next) => {
    try {
      const ep = getEndpoint(req.params.id);
      if (!ep) return res.status(404).json({ error: 'webhook not found' });

      const payload = {
        event: 'payment.accepted' as const,
        timestamp: new Date().toISOString(),
        data: {
          txHash: 'test_' + Math.random().toString(36).slice(2),
          payer:  'TestPayer111111111111111111111111111111111111',
          payee:  'TestPayee111111111111111111111111111111111111',
          amount: '1000000',
          mint:   'So11111111111111111111111111111111111111112',
          test:   true,
        },
      };

      const body = JSON.stringify(payload);
      const sig  = 'sha256=' + (await import('crypto')).default
        .createHmac('sha256', ep.secret).update(body).digest('hex');

      const response = await fetch(ep.url, {
        method:  'POST',
        headers: {
          'Content-Type':       'application/json',
          'X-Aeeron-Signature': sig,
          'X-Aeeron-Event':     payload.event,
          'X-Aeeron-Delivery':  'test',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      res.json({ delivered: true, status: response.status, url: ep.url });
    } catch (err: any) {
      res.json({ delivered: false, error: err.message });
    }
  });
  