import { AgentHealthMonitor } from './AgentHealthMonitor';

  export const healthMonitor = new AgentHealthMonitor({
    intervalMs:      30_000,   // probe every 30s
    idleThresholdMs: 300_000,  // idle after 5 min without payment
    timeoutMs:       3_000,    // 3s per probe
  });
  