import { Keypair, Connection } from '@solana/web3.js';
  import { AeeronClient } from '@aeeron/sdk';
  import type {
    AgentDescriptor,
    AgentCapability,
    AgentConnectionOptions,
    AgentCallResult,
    ConnectionStatus,
  } from './types';

  const DEFAULT_RPC = 'https://api.mainnet-beta.solana.com';

  /**
   * AgentConnection
   *
   * Wraps AeeronClient to provide a high-level interface for calling
   * Aeeron-enabled agents over HTTP with automatic x402 payment handling.
   *
   * Usage:
   *   const conn = await AgentConnection.connect(agentDescriptor, opts);
   *   const result = await conn.call('summarize', { text: '...' });
   *   await conn.close();
   */
  export class AgentConnection {
    private client:  AeeronClient;
    private status:  ConnectionStatus = 'idle';
    private agent:   AgentDescriptor;
    private opts:    Required<AgentConnectionOptions>;

    private constructor(agent: AgentDescriptor, opts: Required<AgentConnectionOptions>, client: AeeronClient) {
      this.agent  = agent;
      this.opts   = opts;
      this.client = client;
    }

    // ─── Factory ───────────────────────────────────────────────────────────────

    static async connect(
      agent:   AgentDescriptor,
      options: AgentConnectionOptions,
    ): Promise<AgentConnection> {
      const opts: Required<AgentConnectionOptions> = {
        rpcEndpoint:      options.rpcEndpoint ?? DEFAULT_RPC,
        maxPriceLamports: options.maxPriceLamports ?? 10_000_000n,
        timeoutMs:        options.timeoutMs ?? 30_000,
        payerKeypair:     options.payerKeypair,
      };

      const connection = new Connection(opts.rpcEndpoint, 'confirmed');
      const client = new AeeronClient({
        connection,
        payer: opts.payerKeypair,
      });

      const instance = new AgentConnection(agent, opts, client);
      instance.status = 'connected';
      return instance;
    }

    // ─── Call ──────────────────────────────────────────────────────────────────

    async call<T = unknown>(
      capabilityName: string,
      payload:        Record<string, unknown> = {},
    ): Promise<AgentCallResult<T>> {
      const cap = this.resolveCapability(capabilityName);
      if (!cap) {
        return { ok: false, error: `capability "${capabilityName}" not found on agent "${this.agent.name}"`, latencyMs: 0 };
      }

      if (cap.priceLamports > this.opts.maxPriceLamports) {
        return {
          ok: false,
          error: `agent asks ${cap.priceLamports} lamports but maxPriceLamports is ${this.opts.maxPriceLamports}`,
          latencyMs: 0,
        };
      }

      const start = Date.now();
      this.status = 'paying';

      try {
        const response = await this.client.fetchWithPayment(cap.endpoint, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
          signal:  AbortSignal.timeout(this.opts.timeoutMs),
        });

        const latencyMs = Date.now() - start;
        this.status = 'connected';

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          return { ok: false, error: `HTTP ${response.status}: ${text}`, latencyMs };
        }

        const data = await response.json() as T;
        return {
          ok:    true,
          data,
          txHash: response.headers.get('X-Payment-TxHash') ?? undefined,
          paidLamports: cap.priceLamports,
          latencyMs,
        };
      } catch (err: unknown) {
        this.status = 'error';
        const latencyMs = Date.now() - start;
        return { ok: false, error: (err as Error).message, latencyMs };
      }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    getStatus(): ConnectionStatus { return this.status; }
    getAgent():  AgentDescriptor  { return this.agent;  }

    resolveCapability(name: string): AgentCapability | undefined {
      return this.agent.capabilities.find((c) => c.name === name);
    }

    async close(): Promise<void> {
      this.status = 'closed';
    }
  }
  