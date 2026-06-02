import type { AgentDescriptor, AgentCapability } from './types';
  import { AgentConnection } from './AgentConnection';
  import type { AgentConnectionOptions } from './types';

  /**
   * MCP tool descriptor (subset of Model Context Protocol spec).
   * Compatible with Claude Desktop, Cursor, and other MCP hosts.
   */
  export interface McpTool {
    name:        string;
    description: string;
    inputSchema: {
      type:       'object';
      properties: Record<string, { type: string; description: string }>;
      required:   string[];
    };
  }

  export interface McpCallResult {
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }

  /**
   * toMcpTools
   *
   * Converts an AgentDescriptor's capabilities into MCP tool descriptors
   * that can be registered with any MCP-compatible host.
   */
  export function toMcpTools(agent: AgentDescriptor): McpTool[] {
    return agent.capabilities.map((cap) => ({
      name:        `${agent.agentId}__${cap.name}`,
      description: `${cap.description} (costs ~${Number(cap.priceLamports) / 1e9} SOL per call via Aeeron x402)`,
      inputSchema: {
        type: 'object',
        properties: {
          payload: {
            type: 'string',
            description: 'JSON-encoded request payload for the agent capability',
          },
        },
        required: ['payload'],
      },
    }));
  }

  /**
   * createMcpHandler
   *
   * Returns a handler function for MCP tool/call requests.
   * Plug this into your MCP server's callTool() implementation.
   *
   * Example (with @modelcontextprotocol/sdk):
   *   server.setRequestHandler(CallToolRequestSchema, createMcpHandler(agent, opts));
   */
  export function createMcpHandler(
    agents:  AgentDescriptor[],
    options: AgentConnectionOptions,
  ): (toolName: string, args: Record<string, unknown>) => Promise<McpCallResult> {
    const connectionCache = new Map<string, AgentConnection>();

    return async (toolName: string, args: Record<string, unknown>): Promise<McpCallResult> => {
      // toolName format: "<agentId>__<capabilityName>"
      const [agentId, capabilityName] = toolName.split('__');
      const agent = agents.find((a) => a.agentId === agentId);

      if (!agent || !capabilityName) {
        return {
          content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
          isError: true,
        };
      }

      // Reuse or create connection
      let conn = connectionCache.get(agentId);
      if (!conn || conn.getStatus() === 'error' || conn.getStatus() === 'closed') {
        conn = await AgentConnection.connect(agent, options);
        connectionCache.set(agentId, conn);
      }

      let payload: Record<string, unknown> = {};
      try {
        payload = typeof args.payload === 'string' ? JSON.parse(args.payload) : (args.payload as Record<string, unknown> ?? {});
      } catch {
        return { content: [{ type: 'text', text: 'Invalid payload: expected JSON string' }], isError: true };
      }

      const result = await conn.call(capabilityName, payload);

      if (!result.ok) {
        return {
          content: [{ type: 'text', text: `Agent error: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [{
          type: 'text',
          text: typeof result.data === 'string'
            ? result.data
            : JSON.stringify(result.data, null, 2),
        }],
      };
    };
  }
  