import { AgentConnection } from '../AgentConnection';
  import type { AgentDescriptor, AgentConnectionOptions } from '../types';

  /**
   * createAgentFetch
   *
   * Returns a drop-in fetch replacement that automatically resolves x402
   * payment challenges for the given agent. Use where you have existing
   * code that calls fetch() and you want to add payment support minimally.
   *
   *   const agentFetch = await createAgentFetch(descriptor, { payerKeypair });
   *   const res = await agentFetch('https://agent.example.com/v1/infer', {
   *     method: 'POST',
   *     body: JSON.stringify({ prompt: 'hello' }),
   *   });
   */
  export async function createAgentFetch(
    agent:   AgentDescriptor,
    options: AgentConnectionOptions,
  ): Promise<typeof fetch> {
    const conn = await AgentConnection.connect(agent, options);

    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString();

      const capabilityName = agent.capabilities.find((c) => url.startsWith(c.endpoint))?.name;
      if (!capabilityName) {
        // Not an agent endpoint — fall through to real fetch
        return fetch(input, init);
      }

      const payload = init?.body ? JSON.parse(init.body as string) : {};
      const result  = await conn.call(capabilityName, payload);

      if (!result.ok) {
        return new Response(JSON.stringify({ error: result.error }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(result.data), {
        status:  200,
        headers: {
          'Content-Type':      'application/json',
          'X-Payment-TxHash':  result.txHash ?? '',
          'X-Paid-Lamports':   result.paidLamports?.toString() ?? '0',
          'X-Latency-Ms':      result.latencyMs.toString(),
        },
      });
    };
  }
  