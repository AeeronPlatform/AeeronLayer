import type { AgentDescriptor, RegistryEntry, RegistrySearchParams } from './types';

  /**
   * AgentRegistry
   *
   * Lightweight in-memory registry for discovering Aeeron-enabled agents.
   * In production this will be backed by an on-chain program (PDA per agent)
   * and a hosted index API at registry.aeeron.xyz.
   */
  export class AgentRegistry {
    private store = new Map<string, RegistryEntry>();

    // ─── Registration ──────────────────────────────────────────────────────────

    register(descriptor: AgentDescriptor): RegistryEntry {
      const entry: RegistryEntry = {
        descriptor,
        lastSeen: new Date().toISOString(),
        online:   true,
      };
      this.store.set(descriptor.agentId, entry);
      return entry;
    }

    unregister(agentId: string): boolean {
      return this.store.delete(agentId);
    }

    heartbeat(agentId: string): void {
      const entry = this.store.get(agentId);
      if (entry) {
        entry.lastSeen = new Date().toISOString();
        entry.online   = true;
      }
    }

    markOffline(agentId: string): void {
      const entry = this.store.get(agentId);
      if (entry) entry.online = false;
    }

    // ─── Discovery ─────────────────────────────────────────────────────────────

    get(agentId: string): RegistryEntry | undefined {
      return this.store.get(agentId);
    }

    list(): RegistryEntry[] {
      return [...this.store.values()];
    }

    search(params: RegistrySearchParams): RegistryEntry[] {
      return this.list().filter(({ descriptor: d }) => {
        if (params.name      && !d.name.toLowerCase().includes(params.name.toLowerCase())) return false;
        if (params.tag       && !d.metadata?.tags?.includes(params.tag))                   return false;
        if (params.framework && d.metadata?.framework !== params.framework)                return false;
        if (params.maxPrice) {
          const minPrice = Math.min(...d.capabilities.map((c) => Number(c.priceLamports)));
          if (minPrice > Number(params.maxPrice)) return false;
        }
        return true;
      });
    }

    // ─── Stats ─────────────────────────────────────────────────────────────────

    stats() {
      const all    = this.list();
      const online = all.filter((e) => e.online).length;
      return { total: all.length, online, offline: all.length - online };
    }
  }

  // Singleton for convenience
  export const globalRegistry = new AgentRegistry();
  