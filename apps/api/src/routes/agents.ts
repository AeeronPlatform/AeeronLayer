import { Router } from 'express';
  import { z } from 'zod';
  import { validateBody } from '../middleware/validateBody';
  import { validateParams } from '../middleware/validateParams';

  export const agentsRouter = Router();

  // In-memory store until on-chain registry ships
  interface AgentRecord {
    agentId:      string;
    name:         string;
    version:      string;
    description:  string;
    wallet:       string;
    capabilities: { name: string; description: string; endpoint: string; priceLamports: string; mint?: string }[];
    metadata?:    { homepage?: string; icon?: string; tags?: string[]; framework?: string };
    registeredAt: string;
    lastHeartbeat: string;
    online:       boolean;
  }

  const registry = new Map<string, AgentRecord>();

  // ─── POST /v1/agents/register ─────────────────────────────────────────────────
  const RegisterBody = z.object({
    agentId:     z.string().min(1).max(128),
    name:        z.string().min(1).max(128),
    version:     z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string().max(512),
    wallet:      z.string().length(44),
    capabilities: z.array(z.object({
      name:          z.string().min(1),
      description:   z.string().max(256),
      endpoint:      z.string().url(),
      priceLamports: z.string().regex(/^\d+$/),
      mint:          z.string().optional(),
    })).min(1).max(20),
    metadata: z.object({
      homepage:  z.string().url().optional(),
      icon:      z.string().url().optional(),
      tags:      z.array(z.string()).max(10).optional(),
      framework: z.string().max(64).optional(),
    }).optional(),
  });

  agentsRouter.post('/register', validateBody(RegisterBody), (req, res) => {
    const body = req.body as z.infer<typeof RegisterBody>;
    const now  = new Date().toISOString();

    const record: AgentRecord = {
      ...body,
      registeredAt:  registry.has(body.agentId) ? registry.get(body.agentId)!.registeredAt : now,
      lastHeartbeat: now,
      online:        true,
    };

    registry.set(body.agentId, record);
    res.status(201).json({ agentId: record.agentId, registeredAt: record.registeredAt });
  });

  // ─── POST /v1/agents/:agentId/heartbeat ───────────────────────────────────────
  agentsRouter.post('/:agentId/heartbeat', (req, res) => {
    const rec = registry.get(req.params.agentId);
    if (!rec) return res.status(404).json({ error: 'agent not found' });
    rec.lastHeartbeat = new Date().toISOString();
    rec.online = true;
    res.json({ ok: true, lastHeartbeat: rec.lastHeartbeat });
  });

  // ─── GET /v1/agents ───────────────────────────────────────────────────────────
  agentsRouter.get('/', (req, res) => {
    const { tag, framework, online } = req.query as Record<string, string>;

    let agents = [...registry.values()];

    if (tag)       agents = agents.filter((a) => a.metadata?.tags?.includes(tag));
    if (framework) agents = agents.filter((a) => a.metadata?.framework === framework);
    if (online !== undefined) {
      const wantOnline = online === 'true';
      agents = agents.filter((a) => a.online === wantOnline);
    }

    res.json({ agents, total: agents.length });
  });

  // ─── GET /v1/agents/:agentId ──────────────────────────────────────────────────
  agentsRouter.get('/:agentId', (req, res) => {
    const rec = registry.get(req.params.agentId);
    if (!rec) return res.status(404).json({ error: 'agent not found' });
    res.json(rec);
  });

  // ─── DELETE /v1/agents/:agentId ───────────────────────────────────────────────
  agentsRouter.delete('/:agentId', (req, res) => {
    const removed = registry.delete(req.params.agentId);
    if (!removed) return res.status(404).json({ error: 'agent not found' });
    res.status(204).send();
  });
  