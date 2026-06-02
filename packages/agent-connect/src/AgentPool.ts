import { AgentConnection } from './AgentConnection';
  import { AgentChannelConnection } from './AgentChannelConnection';
  import type {
    AgentDescriptor,
    AgentConnectionOptions,
    AgentCallResult,
  } from './types';

  type AnyConnection = AgentConnection | AgentChannelConnection;

  interface PoolOptions extends AgentConnectionOptions {
    /** Number of concurrent connections to maintain (default: 3) */
    size?: number;
    /** Use channel connections instead of direct-pay (default: false) */
    useChannels?: boolean;
    /** ms between health-check pings (default: 30_000, 0 = disabled) */
    healthCheckIntervalMs?: number;
  }

  interface PoolStats {
    size:       number;
    healthy:    number;
    totalCalls: number;
    errors:     number;
    avgLatencyMs: number;
  }

  /**
   * AgentPool
   *
   * Maintains a fixed-size pool of connections to the same agent.
   * Dispatches calls round-robin; replaces dropped connections automatically.
   *
   * Usage:
   *   const pool = await AgentPool.create(descriptor, { size: 5, useChannels: true, payerKeypair });
   *   const results = await Promise.all(requests.map(r => pool.call('infer', r)));
   *   await pool.drain();
   */
  export class AgentPool {
    private conns:      AnyConnection[]  = [];
    private cursor      = 0;
    private stats       = { totalCalls: 0, errors: 0, totalLatency: 0 };
    private healthTimer: ReturnType<typeof setInterval> | null = null;

    private agent:  AgentDescriptor;
    private opts:   Required<PoolOptions>;

    private constructor(agent: AgentDescriptor, opts: Required<PoolOptions>) {
      this.agent = agent;
      this.opts  = opts;
    }

    // ─── Factory ───────────────────────────────────────────────────────────────

    static async create(agent: AgentDescriptor, options: PoolOptions): Promise<AgentPool> {
      const opts: Required<PoolOptions> = {
        size:                  options.size                  ?? 3,
        useChannels:           options.useChannels           ?? false,
        healthCheckIntervalMs: options.healthCheckIntervalMs ?? 30_000,
        rpcEndpoint:           options.rpcEndpoint           ?? 'https://api.mainnet-beta.solana.com',
        maxPriceLamports:      options.maxPriceLamports      ?? 10_000_000n,
        timeoutMs:             options.timeoutMs             ?? 30_000,
        payerKeypair:          options.payerKeypair,
      };

      const pool = new AgentPool(agent, opts);
      await pool.fill();

      if (opts.healthCheckIntervalMs > 0) {
        pool.healthTimer = setInterval(() => pool.healthCheck(), opts.healthCheckIntervalMs);
      }

      return pool;
    }

    // ─── Call dispatch ─────────────────────────────────────────────────────────

    async call<T = unknown>(
      capabilityName: string,
      payload: Record<string, unknown> = {},
    ): Promise<AgentCallResult<T>> {
      if (this.conns.length === 0) await this.fill();

      const conn = this.conns[this.cursor % this.conns.length];
      this.cursor = (this.cursor + 1) % this.conns.length;

      const result = await conn.call<T>(capabilityName, payload);

      this.stats.totalCalls++;
      this.stats.totalLatency += result.latencyMs;
      if (!result.ok) this.stats.errors++;

      // Replace dead connections
      if (conn.getStatus() === 'error') {
        const idx = this.conns.indexOf(conn);
        if (idx !== -1) {
          this.conns[idx] = await this.openOne();
        }
      }

      return result;
    }

    // ─── Pool management ───────────────────────────────────────────────────────

    private async fill(): Promise<void> {
      const needed = this.opts.size - this.conns.length;
      if (needed <= 0) return;
      const newConns = await Promise.all(Array.from({ length: needed }, () => this.openOne()));
      this.conns.push(...newConns);
    }

    private async openOne(): Promise<AnyConnection> {
      if (this.opts.useChannels) {
        return AgentChannelConnection.open(this.agent, this.opts);
      }
      return AgentConnection.connect(this.agent, this.opts);
    }

    private async healthCheck(): Promise<void> {
      const dead = this.conns.filter((c) => c.getStatus() === 'error' || c.getStatus() === 'closed');
      if (dead.length === 0) return;
      await Promise.allSettled(
        dead.map(async (c) => {
          const idx = this.conns.indexOf(c);
          if (idx !== -1) this.conns[idx] = await this.openOne();
        }),
      );
    }

    async drain(): Promise<void> {
      if (this.healthTimer) clearInterval(this.healthTimer);
      await Promise.allSettled(
        this.conns.map((c) =>
          'closeChannel' in c ? (c as AgentChannelConnection).closeChannel() : c.close(),
        ),
      );
      this.conns = [];
    }

    getStats(): PoolStats {
      return {
        size:          this.opts.size,
        healthy:       this.conns.filter((c) => c.getStatus() === 'connected').length,
        totalCalls:    this.stats.totalCalls,
        errors:        this.stats.errors,
        avgLatencyMs:  this.stats.totalCalls > 0
          ? Math.round(this.stats.totalLatency / this.stats.totalCalls)
          : 0,
      };
    }
  }
  