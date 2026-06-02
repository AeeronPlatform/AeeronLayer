import { PublicKey } from '@solana/web3.js';

  // ─── Agent descriptor ─────────────────────────────────────────────────────────

  export interface AgentCapability {
    name:        string;
    description: string;
    endpoint:    string;          // URL that accepts x402 payments
    priceLamports: bigint;        // price per call in lamports (or token base units)
    mint?:       string;          // if omitted → SOL
  }

  export interface AgentDescriptor {
    /** Stable identifier — owner wallet pubkey */
    agentId:     string;
    name:        string;
    version:     string;
    description: string;
    wallet:      PublicKey;
    capabilities: AgentCapability[];
    metadata?: {
      homepage?:    string;
      icon?:        string;
      tags?:        string[];
      framework?:   string;       // e.g. "langchain", "autogen", "custom"
    };
    registeredAt: string;         // ISO timestamp
    updatedAt:    string;
  }

  // ─── Connection state ─────────────────────────────────────────────────────────

  export type ConnectionStatus =
    | 'idle'
    | 'connecting'
    | 'connected'
    | 'paying'
    | 'error'
    | 'closed';

  export interface AgentConnectionOptions {
    /** Payer wallet keypair (agent making the call) */
    payerKeypair: import('@solana/web3.js').Keypair;
    /** Solana RPC endpoint */
    rpcEndpoint?: string;
    /** Max lamports willing to pay for a single call; rejects if agent asks more */
    maxPriceLamports?: bigint;
    /** Timeout per request in ms (default 30_000) */
    timeoutMs?: number;
  }

  // ─── Call result ──────────────────────────────────────────────────────────────

  export interface AgentCallResult<T = unknown> {
    ok:        boolean;
    data?:     T;
    error?:    string;
    txHash?:   string;
    paidLamports?: bigint;
    latencyMs: number;
  }

  // ─── Registry ─────────────────────────────────────────────────────────────────

  export interface RegistryEntry {
    descriptor: AgentDescriptor;
    lastSeen:   string;
    online:     boolean;
  }

  export interface RegistrySearchParams {
    tag?:      string;
    name?:     string;
    framework?: string;
    maxPrice?: bigint;
  }
  