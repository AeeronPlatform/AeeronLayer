import crypto from 'crypto';
  import type { AgentDescriptor } from './types';

  export type SessionStatus = 'active' | 'expired' | 'closed';

  export interface AgentSession {
    sessionId:    string;
    agentId:      string;
    payerWallet:  string;
    startedAt:    string;
    expiresAt:    string;
    totalCalls:   number;
    totalSpentLamports: bigint;
    status:       SessionStatus;
    tags:         string[];
  }

  interface CreateSessionOptions {
    agent:        AgentDescriptor;
    payerWallet:  string;
    ttlSeconds?:  number;   // default: 3600 (1 hour)
    tags?:        string[];
  }

  /**
   * AgentSessionManager
   *
   * Tracks spend, call count, and TTL for interactions with a specific agent.
   * Useful for budget enforcement, auditing, and session-scoped rate limits.
   *
   * Usage:
   *   const mgr  = new AgentSessionManager();
   *   const sess = mgr.create({ agent, payerWallet: keypair.publicKey.toBase58() });
   *   mgr.recordCall(sess.sessionId, cap.priceLamports);
   *   // ...
   *   mgr.close(sess.sessionId);
   */
  export class AgentSessionManager {
    private sessions = new Map<string, AgentSession>();

    create(opts: CreateSessionOptions): AgentSession {
      const now     = new Date();
      const ttl     = opts.ttlSeconds ?? 3_600;
      const expires = new Date(now.getTime() + ttl * 1_000);

      const session: AgentSession = {
        sessionId:          crypto.randomUUID(),
        agentId:            opts.agent.agentId,
        payerWallet:        opts.payerWallet,
        startedAt:          now.toISOString(),
        expiresAt:          expires.toISOString(),
        totalCalls:         0,
        totalSpentLamports: 0n,
        status:             'active',
        tags:               opts.tags ?? [],
      };

      this.sessions.set(session.sessionId, session);
      return session;
    }

    recordCall(sessionId: string, lamports: bigint): void {
      const s = this.mustGet(sessionId);
      s.totalCalls++;
      s.totalSpentLamports += lamports;
    }

    close(sessionId: string): AgentSession {
      const s = this.mustGet(sessionId);
      s.status = 'closed';
      return s;
    }

    get(sessionId: string): AgentSession | undefined {
      const s = this.sessions.get(sessionId);
      if (s && s.status === 'active' && new Date() > new Date(s.expiresAt)) {
        s.status = 'expired';
      }
      return s;
    }

    list(agentId?: string): AgentSession[] {
      const all = [...this.sessions.values()];
      return agentId ? all.filter((s) => s.agentId === agentId) : all;
    }

    stats() {
      const all     = this.list();
      const active  = all.filter((s) => s.status === 'active').length;
      const total   = all.reduce((sum, s) => sum + s.totalSpentLamports, 0n);
      const calls   = all.reduce((sum, s) => sum + s.totalCalls, 0);
      return { total: all.length, active, totalSpentLamports: total.toString(), totalCalls: calls };
    }

    private mustGet(sessionId: string): AgentSession {
      const s = this.sessions.get(sessionId);
      if (!s) throw new Error(`session ${sessionId} not found`);
      return s;
    }
  }

  export const globalSessionManager = new AgentSessionManager();
  