export { AgentConnection }         from './AgentConnection';
  export { AgentChannelConnection }  from './AgentChannelConnection';
  export { AgentPool }               from './AgentPool';
  export { AgentRegistry, globalRegistry } from './registry';
  export { createAgentFetch }        from './adapters/fetch';
  export { toMcpTools, createMcpHandler } from './mcp';
  export type {
    AgentDescriptor,
    AgentCapability,
    AgentConnectionOptions,
    AgentCallResult,
    ConnectionStatus,
    RegistryEntry,
    RegistrySearchParams,
  } from './types';
  export type { McpTool, McpCallResult } from './mcp';
  