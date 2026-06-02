import { Router } from 'express';
  import { z } from 'zod';
  import { validateBody } from '../middleware/validateBody';

  export const sessionsRouter = Router();

  // In-memory store (mirrors AgentSessionManager logic for the API layer)
  interface SessionRecord {
    sessionId:          string;
    agentId:            string;
    payerWallet:        string;
    startedAt:          string;
    expiresAt:          string;
    totalCalls:         number;
    totalSpentLamports: string;
    status:             'active' | 'expired' | 'closed';
    tags:               string[];
  }

  const store = new Map<string, SessionRecord>();

  function maybeExpire(s: SessionRecord): SessionRecord {
    if (s.status === 'active' && new Date() > new Date(s.expiresAt)) {
      s.status = 'expired';
    }
    return s;
  }

  // ─── POST /v1/sessions ────────────────────────────────────────────────────────
  const CreateBody = z.object({
    agentId:     z.string().min(1),
    payerWallet: z.string().length(44),
    ttlSeconds:  z.number().int().min(60).max(86_400).optional(),
    tags:        z.array(z.string().max(32)).max(10).optional(),
  });

  sessionsRouter.post('/', validateBody(CreateBody), (req, res) => {
    const { agentId, payerWallet, ttlSeconds = 3_600, tags = [] } = req.body as z.infer<typeof CreateBody>;
    const now     = new Date();
    const expires = new Date(now.getTime() + ttlSeconds * 1_000);

    const session: SessionRecord = {
      sessionId:          crypto.randomUUID(),
      agentId,
      payerWallet,
      startedAt:          now.toISOString(),
      expiresAt:          expires.toISOString(),
      totalCalls:         0,
      totalSpentLamports: '0',
      status:             'active',
      tags,
    };

    store.set(session.sessionId, session);
    res.status(201).json(session);
  });

  // ─── GET /v1/sessions ─────────────────────────────────────────────────────────
  sessionsRouter.get('/', (req, res) => {
    const { agentId, status } = req.query as Record<string, string>;
    let sessions = [...store.values()].map(maybeExpire);

    if (agentId) sessions = sessions.filter((s) => s.agentId === agentId);
    if (status)  sessions = sessions.filter((s) => s.status === status);

    const totalSpent = sessions.reduce((sum, s) => sum + BigInt(s.totalSpentLamports), 0n);
    res.json({ sessions, total: sessions.length, totalSpentLamports: totalSpent.toString() });
  });

  // ─── GET /v1/sessions/:id ─────────────────────────────────────────────────────
  sessionsRouter.get('/:id', (req, res) => {
    const s = store.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    res.json(maybeExpire(s));
  });

  // ─── POST /v1/sessions/:id/record ────────────────────────────────────────────
  const RecordBody = z.object({ lamports: z.string().regex(/^\d+$/) });

  sessionsRouter.post('/:id/record', validateBody(RecordBody), (req, res) => {
    const s = store.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    maybeExpire(s);
    if (s.status !== 'active') return res.status(409).json({ error: `session is ${s.status}` });

    s.totalCalls++;
    s.totalSpentLamports = (BigInt(s.totalSpentLamports) + BigInt(req.body.lamports)).toString();
    res.json({ sessionId: s.sessionId, totalCalls: s.totalCalls, totalSpentLamports: s.totalSpentLamports });
  });

  // ─── DELETE /v1/sessions/:id ──────────────────────────────────────────────────
  sessionsRouter.delete('/:id', (req, res) => {
    const s = store.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'session not found' });
    s.status = 'closed';
    res.json({ sessionId: s.sessionId, status: 'closed', summary: {
      totalCalls: s.totalCalls,
      totalSpentLamports: s.totalSpentLamports,
      duration: Math.floor((new Date().getTime() - new Date(s.startedAt).getTime()) / 1000) + 's',
    }});
  });
  