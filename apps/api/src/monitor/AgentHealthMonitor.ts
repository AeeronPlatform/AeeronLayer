import { db }        from '../db';
  import { agents }     from '../db/schema';
  import { eq }         from 'drizzle-orm';
  import { eventBus }   from '../events/EventBus';
  import { logger }     from '../logger';

  type AgentStatus = 'online' | 'idle' | 'offline';

  interface HealthResult {
    agentId:   string;
    status:    AgentStatus;
    latencyMs: number | null;
    checkedAt: number;
  }

  /**
   * AgentHealthMonitor
   *
   * Background service that pings all registered agent endpoints on a fixed
   * interval and writes updated status + latency back to the agents table.
   *
   * Status rules:
   *   - online  : responded < 3 s, HTTP 2xx
   *   - idle    : responded < 3 s, HTTP 2xx, but last payment > idleThresholdMs ago
   *   - offline : no response, timeout, or non-2xx
   *
   * Events emitted on the internal EventBus:
   *   - agent.heartbeat : every successful ping
   *   - agent.offline   : when a previously-online agent stops responding (after 2 consecutive failures)
   *
   * Usage:
   *   const monitor = new AgentHealthMonitor({ intervalMs: 30_000 });
   *   monitor.start();
   *   // on shutdown:
   *   monitor.stop();
   */
  export class AgentHealthMonitor {
    private intervalMs:      number;
    private idleThresholdMs: number;
    private timeoutMs:       number;
    private timer:           ReturnType<typeof setInterval> | null = null;
    private failures:        Map<string, number> = new Map();

    constructor(opts: { intervalMs?: number; idleThresholdMs?: number; timeoutMs?: number } = {}) {
      this.intervalMs      = opts.intervalMs      ?? 30_000;
      this.idleThresholdMs = opts.idleThresholdMs ?? 5 * 60_000;
      this.timeoutMs       = opts.timeoutMs       ?? 3_000;
    }

    start(): void {
      if (this.timer) return;
      logger.info({ intervalMs: this.intervalMs }, 'agent health monitor started');
      this.timer = setInterval(() => void this.runCycle(), this.intervalMs);
      void this.runCycle(); // immediate first check
    }

    stop(): void {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      logger.info('agent health monitor stopped');
    }

    private async runCycle(): Promise<void> {
      let rows: { agentId: string; endpoint: string; lastPaymentAt: Date | null }[];
      try {
        rows = await db.select({
          agentId:       agents.agentId,
          endpoint:      agents.endpoint,
          lastPaymentAt: agents.lastPaymentAt,
        }).from(agents);
      } catch (err) {
        logger.warn({ err }, 'health monitor: failed to fetch agents');
        return;
      }

      const results = await Promise.allSettled(
        rows.map((row) => this.checkAgent(row.agentId, row.endpoint, row.lastPaymentAt)),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          await this.persist(result.value);
        }
      }
    }

    private async checkAgent(
      agentId:       string,
      endpoint:      string,
      lastPaymentAt: Date | null,
    ): Promise<HealthResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const start = Date.now();

      try {
        const res = await fetch(`${endpoint}/health`, {
          method: 'GET',
          headers: { 'X-Aeeron-Probe': '1' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        const latencyMs = Date.now() - start;

        if (!res.ok) {
          this.failures.set(agentId, (this.failures.get(agentId) ?? 0) + 1);
          return { agentId, status: 'offline', latencyMs, checkedAt: Date.now() };
        }

        this.failures.delete(agentId);

        const isIdle =
          lastPaymentAt !== null &&
          Date.now() - lastPaymentAt.getTime() > this.idleThresholdMs;

        return {
          agentId,
          status:    isIdle ? 'idle' : 'online',
          latencyMs,
          checkedAt: Date.now(),
        };
      } catch {
        clearTimeout(timer);
        const failures = (this.failures.get(agentId) ?? 0) + 1;
        this.failures.set(agentId, failures);
        return { agentId, status: 'offline', latencyMs: null, checkedAt: Date.now() };
      }
    }

    private async persist(result: HealthResult): Promise<void> {
      try {
        const prev = await db.query.agents.findFirst({
          where: (a, { eq: eqFn }) => eqFn(a.agentId, result.agentId),
          columns: { status: true },
        });

        await db.update(agents)
          .set({
            status:    result.status,
            latencyMs: result.latencyMs,
            checkedAt: new Date(result.checkedAt),
          })
          .where(eq(agents.agentId, result.agentId));

        if (result.status === 'online' || result.status === 'idle') {
          eventBus.emit('agent.heartbeat', {
            agentId:   result.agentId,
            status:    result.status,
            latencyMs: result.latencyMs,
            checkedAt: result.checkedAt,
          }, result.agentId);
        }

        // Emit offline event only on second consecutive failure to avoid noise
        const failures = this.failures.get(result.agentId) ?? 0;
        if (result.status === 'offline' && failures === 2 && prev?.status !== 'offline') {
          logger.warn({ agentId: result.agentId }, 'agent went offline');
          eventBus.emit('agent.offline', {
            agentId:   result.agentId,
            checkedAt: result.checkedAt,
          }, result.agentId);
        }
      } catch (err) {
        logger.warn({ err, agentId: result.agentId }, 'health monitor: failed to persist result');
      }
    }
  }
  