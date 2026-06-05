import {
    AgentConnection,
    AgentChannelConnection,
    AgentPool,
    AgentSessionManager,
    AgentRegistry,
    globalRegistry,
    type AgentDescriptor,
    type AgentConnectionOptions,
    type AgentCallResult,
    type AgentSession,
  } from '@aeeron/agent-connect';
  import {
    verifyPaymentProof,
    simulateComparison,
    AEERON_MINT,
    AEERON_SYMBOL,
    type PaymentProof,
    type SimulateComparisonResult,
  } from '@aeeron/protocol';

  export interface AeeronClientOptions {
    /** Payer keypair (base58 secret key). Required for initiating payments. */
    payerKeypair: Uint8Array;
    /** Solana RPC endpoint (default: mainnet-beta). */
    rpcEndpoint?: string;
    /** Max price per agent call in lamports (default: 10_000_000). */
    maxPriceLamports?: bigint;
    /** Request timeout in ms (default: 30_000). */
    timeoutMs?: number;
    /** Gateway secret for proof verification (server-side only). */
    gatewaySecret?: string;
  }

  export interface CallOptions {
    /** Override max price for this call only. */
    maxPriceLamports?: bigint;
    /** Attach to an existing session ID. */
    sessionId?: string;
    /** Force direct payment even if a pool exists. */
    forceDirect?: boolean;
  }

  /**
   * AeeronClient
   *
   * High-level entry point for the Aeeron x402 SDK.
   * Manages agent discovery, connection pools, session tracking, and proof verification
   * behind a single ergonomic API.
   *
   * Quick start:
   *
   *   import { AeeronClient } from '@aeeron/sdk';
   *
   *   const aeeron = new AeeronClient({ payerKeypair: keypair.secretKey });
   *
   *   const agent = await aeeron.discover('agent_summarizer_v1');
   *   const result = await aeeron.call(agent, 'summarize', { text: '...' });
   *   console.log(result.data);
   *
   *   await aeeron.destroy();
   */
  export class AeeronClient {
    private opts:     Required<AeeronClientOptions>;
    private pools:    Map<string, AgentPool>   = new Map();
    private sessions: AgentSessionManager      = new AgentSessionManager();
    readonly registry: AgentRegistry           = globalRegistry;

    constructor(options: AeeronClientOptions) {
      this.opts = {
        payerKeypair:     options.payerKeypair,
        rpcEndpoint:      options.rpcEndpoint      ?? 'https://api.mainnet-beta.solana.com',
        maxPriceLamports: options.maxPriceLamports  ?? 10_000_000n,
        timeoutMs:        options.timeoutMs         ?? 30_000,
        gatewaySecret:    options.gatewaySecret     ?? '',
      };
    }

    // ─── Agent discovery ────────────────────────────────────────────────────────

    async discover(agentId: string): Promise<AgentDescriptor> {
      const entry = this.registry.get(agentId);
      if (!entry) throw new Error(`Agent "${agentId}" not found in registry`);
      return entry.descriptor;
    }

    async resolveOrDiscover(agent: AgentDescriptor | string): Promise<AgentDescriptor> {
      if (typeof agent === 'string') return this.discover(agent);
      return agent;
    }

    // ─── Call dispatch ───────────────────────────────────────────────────────────

    async call<T = unknown>(
      agent:          AgentDescriptor | string,
      capabilityName: string,
      payload:        Record<string, unknown> = {},
      opts:           CallOptions = {},
    ): Promise<AgentCallResult<T>> {
      const descriptor = await this.resolveOrDiscover(agent);
      const agentId    = descriptor.agentId;

      let pool = this.pools.get(agentId);
      if (!pool && !opts.forceDirect) {
        const comparison = simulateComparison(
          opts.maxPriceLamports ?? this.opts.maxPriceLamports,
          10, // lookahead
        );
        const useChannels = comparison.recommendation === 'channel';
        pool = await AgentPool.create(descriptor, {
          size:            3,
          useChannels,
          payerKeypair:    this.opts.payerKeypair,
          rpcEndpoint:     this.opts.rpcEndpoint,
          maxPriceLamports: opts.maxPriceLamports ?? this.opts.maxPriceLamports,
          timeoutMs:       this.opts.timeoutMs,
        });
        this.pools.set(agentId, pool);
      }

      const result = pool
        ? await pool.call<T>(capabilityName, payload)
        : await this.directCall<T>(descriptor, capabilityName, payload, opts);

      // Record spend in session if attached
      if (opts.sessionId && result.ok) {
        const cap = descriptor.capabilities.find((c) => c.name === capabilityName);
        if (cap) this.sessions.recordCall(opts.sessionId, cap.priceLamports);
      }

      return result;
    }

    private async directCall<T>(
      agent:          AgentDescriptor,
      capabilityName: string,
      payload:        Record<string, unknown>,
      opts:           CallOptions,
    ): Promise<AgentCallResult<T>> {
      const conn = await AgentConnection.connect(agent, {
        payerKeypair:     this.opts.payerKeypair,
        rpcEndpoint:      this.opts.rpcEndpoint,
        maxPriceLamports: opts.maxPriceLamports ?? this.opts.maxPriceLamports,
        timeoutMs:        this.opts.timeoutMs,
      });
      const result = await conn.call<T>(capabilityName, payload);
      conn.close();
      return result;
    }

    // ─── Sessions ────────────────────────────────────────────────────────────────

    openSession(agent: AgentDescriptor, payerWallet: string, ttlSeconds?: number): AgentSession {
      return this.sessions.create({ agent, payerWallet, ttlSeconds });
    }

    getSession(sessionId: string) { return this.sessions.get(sessionId); }
    closeSession(sessionId: string) { return this.sessions.close(sessionId); }

    // ─── Proof verification ──────────────────────────────────────────────────────

    verifyProof(proof: PaymentProof, maxAgeMs?: number) {
      if (!this.opts.gatewaySecret) throw new Error('gatewaySecret is required for proof verification');
      return verifyPaymentProof(proof, { gatewaySecret: this.opts.gatewaySecret, maxAgeMs });
    }

    // ─── Fee estimation ──────────────────────────────────────────────────────────

    estimateFees(pricePerCallLamports: bigint, calls: number): SimulateComparisonResult {
      return simulateComparison(pricePerCallLamports, calls);
    }

    // ─── Token info ──────────────────────────────────────────────────────────────

    get token() {
      return { mint: AEERON_MINT, symbol: AEERON_SYMBOL } as const;
    }

    // ─── Lifecycle ───────────────────────────────────────────────────────────────

    async destroy(): Promise<void> {
      await Promise.all([...this.pools.values()].map((p) => p.drain()));
      this.pools.clear();
    }
  }
  