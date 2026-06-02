import { Keypair, Connection } from '@solana/web3.js';
  import { AeeronClient, ChannelManager } from '@aeeron/sdk';
  import type {
    AgentDescriptor,
    AgentCapability,
    AgentConnectionOptions,
    AgentCallResult,
    ConnectionStatus,
  } from './types';

  interface ChannelConnectionOptions extends AgentConnectionOptions {
    /** Pre-fund the channel with this many lamports on open (default: 10M) */
    channelFundLamports?: bigint;
    /** Auto-refund channel when balance drops below this threshold */
    autoRefundThreshold?: bigint;
    /** Auto-refund amount when threshold is hit */
    autoRefundAmount?: bigint;
  }

  interface ChannelInfo {
    channelPda: string;
    balance:    bigint;
    settled:    bigint;
    openedAt:   string;
  }

  /**
   * AgentChannelConnection
   *
   * Like AgentConnection but opens a payment channel on first call.
   * Subsequent calls settle off-chain — no per-call Solana transaction.
   * Use this for high-frequency agent invocations (> ~5 calls/session).
   *
   * Usage:
   *   const conn = await AgentChannelConnection.open(agent, opts);
   *   const r1 = await conn.call('embed', { text: '...' });
   *   const r2 = await conn.call('embed', { text: '...' });  // no on-chain tx
   *   await conn.closeChannel();  // settles final balance on-chain
   */
  export class AgentChannelConnection {
    private client:  AeeronClient;
    private channels: ChannelManager;
    private channel: ChannelInfo | null = null;
    private status:  ConnectionStatus = 'idle';
    private agent:   AgentDescriptor;
    private opts:    Required<ChannelConnectionOptions>;

    private constructor(
      agent: AgentDescriptor,
      opts: Required<ChannelConnectionOptions>,
      client: AeeronClient,
      channels: ChannelManager,
    ) {
      this.agent    = agent;
      this.opts     = opts;
      this.client   = client;
      this.channels = channels;
    }

    // ─── Factory ───────────────────────────────────────────────────────────────

    static async open(
      agent:   AgentDescriptor,
      options: ChannelConnectionOptions,
    ): Promise<AgentChannelConnection> {
      const opts: Required<ChannelConnectionOptions> = {
        rpcEndpoint:         options.rpcEndpoint         ?? 'https://api.mainnet-beta.solana.com',
        maxPriceLamports:    options.maxPriceLamports     ?? 10_000_000n,
        timeoutMs:           options.timeoutMs            ?? 30_000,
        channelFundLamports: options.channelFundLamports  ?? 10_000_000n,
        autoRefundThreshold: options.autoRefundThreshold  ?? 1_000_000n,
        autoRefundAmount:    options.autoRefundAmount      ?? 5_000_000n,
        payerKeypair:        options.payerKeypair,
      };

      const connection = new Connection(opts.rpcEndpoint, 'confirmed');
      const client     = new AeeronClient({ connection, payer: opts.payerKeypair });
      const channels   = new ChannelManager({ connection, payer: opts.payerKeypair });

      const instance = new AgentChannelConnection(agent, opts, client, channels);

      // Open channel to agent wallet
      const { channelPda } = await channels.open(agent.wallet, opts.channelFundLamports);
      instance.channel = {
        channelPda: channelPda.toBase58(),
        balance:    opts.channelFundLamports,
        settled:    0n,
        openedAt:   new Date().toISOString(),
      };
      instance.status = 'connected';
      return instance;
    }

    // ─── Call ──────────────────────────────────────────────────────────────────

    async call<T = unknown>(
      capabilityName: string,
      payload: Record<string, unknown> = {},
    ): Promise<AgentCallResult<T>> {
      const cap = this.resolveCapability(capabilityName);
      if (!cap) {
        return { ok: false, error: `capability "${capabilityName}" not found`, latencyMs: 0 };
      }
      if (cap.priceLamports > this.opts.maxPriceLamports) {
        return { ok: false, error: `price ${cap.priceLamports} exceeds max ${this.opts.maxPriceLamports}`, latencyMs: 0 };
      }

      // Auto-refund if balance is running low
      if (this.channel && this.channel.balance < this.opts.autoRefundThreshold) {
        await this.refundChannel(this.opts.autoRefundAmount);
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

        if (this.channel) {
          this.channel.settled += cap.priceLamports;
          this.channel.balance -= cap.priceLamports;
        }

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          return { ok: false, error: `HTTP ${response.status}: ${text}`, latencyMs };
        }

        const data = await response.json() as T;
        return {
          ok: true, data,
          txHash:       response.headers.get('X-Payment-TxHash') ?? undefined,
          paidLamports: cap.priceLamports,
          latencyMs,
        };
      } catch (err: unknown) {
        this.status = 'error';
        return { ok: false, error: (err as Error).message, latencyMs: Date.now() - start };
      }
    }

    // ─── Channel management ────────────────────────────────────────────────────

    async refundChannel(amount: bigint): Promise<void> {
      if (!this.channel) return;
      await this.channels.fund(this.agent.wallet, amount);
      this.channel.balance += amount;
    }

    async closeChannel(): Promise<{ settled: bigint; refunded: bigint }> {
      if (!this.channel) return { settled: 0n, refunded: 0n };
      await this.channels.close(this.agent.wallet);
      const result = { settled: this.channel.settled, refunded: this.channel.balance };
      this.channel = null;
      this.status  = 'closed';
      return result;
    }

    channelInfo(): ChannelInfo | null { return this.channel; }
    getStatus():   ConnectionStatus   { return this.status;  }
    getAgent():    AgentDescriptor    { return this.agent;   }

    resolveCapability(name: string): AgentCapability | undefined {
      return this.agent.capabilities.find((c) => c.name === name);
    }
  }
  