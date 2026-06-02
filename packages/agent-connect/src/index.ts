export { AgentConnection }         from './AgentConnection';
  export { AgentChannelConnection }  from './AgentChannelConnection';
  export { AgentRegistry, globalRegistry } from './registry';
  export { createAgentFetch }        from './adapters/fetch';
  export type {
    AgentDescriptor,
    AgentCapability,
    AgentConnectionOptions,
    AgentCallResult,
    ConnectionStatus,
    RegistryEntry,
    RegistrySearchParams,
  } from './types';
  