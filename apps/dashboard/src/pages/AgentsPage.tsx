import { useState } from 'react';

  type Framework = 'all' | 'langchain' | 'autogen' | 'custom';

  interface Capability {
    name:          string;
    description:   string;
    endpoint:      string;
    priceLamports: string;
  }

  interface Agent {
    agentId:      string;
    name:         string;
    version:      string;
    description:  string;
    wallet:       string;
    online:       boolean;
    lastHeartbeat: string;
    capabilities: Capability[];
    metadata?: { tags?: string[]; framework?: string; homepage?: string };
  }

  // Seed data until live API is wired
  const MOCK_AGENTS: Agent[] = [
    {
      agentId: 'agent_summarizer_v1',
      name: 'Text Summarizer',
      version: '1.2.0',
      description: 'Summarizes long-form text into concise bullet-point briefs.',
      wallet: 'SuMM4r1zer1111111111111111111111111111111111',
      online: true,
      lastHeartbeat: new Date(Date.now() - 12_000).toISOString(),
      capabilities: [
        { name: 'summarize', description: 'Summarize text', endpoint: 'https://summarizer.agent.aeeron.xyz/v1/summarize', priceLamports: '50000' },
      ],
      metadata: { tags: ['nlp', 'text'], framework: 'langchain' },
    },
    {
      agentId: 'agent_embedder_v2',
      name: 'Embedding Service',
      version: '2.0.1',
      description: 'Generates 1536-dim text embeddings using Ada-002 compatible interface.',
      wallet: 'EMb3dd3r111111111111111111111111111111111111',
      online: true,
      lastHeartbeat: new Date(Date.now() - 4_000).toISOString(),
      capabilities: [
        { name: 'embed',       description: 'Single text embedding',  endpoint: 'https://embedder.agent.aeeron.xyz/v1/embed',        priceLamports: '20000' },
        { name: 'embed_batch', description: 'Batch text embeddings',  endpoint: 'https://embedder.agent.aeeron.xyz/v1/embed/batch',  priceLamports: '80000' },
      ],
      metadata: { tags: ['embeddings', 'nlp'], framework: 'custom' },
    },
    {
      agentId: 'agent_code_reviewer',
      name: 'Code Reviewer',
      version: '0.9.4',
      description: 'Reviews diffs and pull requests, returns structured findings.',
      wallet: 'C0d3Rev1ew11111111111111111111111111111111111',
      online: false,
      lastHeartbeat: new Date(Date.now() - 90_000).toISOString(),
      capabilities: [
        { name: 'review_diff', description: 'Review a git diff', endpoint: 'https://reviewer.agent.aeeron.xyz/v1/review', priceLamports: '200000' },
      ],
      metadata: { tags: ['code', 'devtools'], framework: 'autogen' },
    },
  ];

  const FRAMEWORK_LABELS: Record<string, string> = {
    langchain: 'LangChain',
    autogen:   'AutoGen',
    custom:    'Custom',
  };

  function lamportsToSol(l: string) {
    return (Number(l) / 1e9).toFixed(6);
  }

  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  }

  export default function AgentsPage() {
    const [filter, setFilter] = useState<Framework>('all');
    const [onlineOnly, setOnlineOnly] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);

    const agents = MOCK_AGENTS
      .filter((a) => filter === 'all' || a.metadata?.framework === filter)
      .filter((a) => !onlineOnly || a.online);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-white">Agent Network</h1>
          <p className="text-sm text-zinc-400">Aeeron-enabled agents registered on the network.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
            {(['all', 'langchain', 'autogen', 'custom'] as Framework[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'All' : FRAMEWORK_LABELS[f]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="accent-indigo-500"
            />
            Online only
          </label>
          <span className="ml-auto text-xs text-zinc-500">{agents.length} agent{agents.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Agent cards */}
        <div className="space-y-2">
          {agents.map((agent) => (
            <div key={agent.agentId} className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
              {/* Header row */}
              <button
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/4 transition-colors"
                onClick={() => setExpanded(expanded === agent.agentId ? null : agent.agentId)}
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${agent.online ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{agent.name}</span>
                    <span className="text-xs text-zinc-500">v{agent.version}</span>
                    {agent.metadata?.framework && (
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] text-indigo-300">
                        {FRAMEWORK_LABELS[agent.metadata.framework] ?? agent.metadata.framework}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-zinc-500 mt-0.5">{agent.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-zinc-500">{agent.capabilities.length} capability{agent.capabilities.length !== 1 ? 'ies' : 'y'}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgo(agent.lastHeartbeat)}</p>
                </div>
              </button>

              {/* Expanded detail */}
              {expanded === agent.agentId && (
                <div className="border-t border-white/8 p-4 space-y-4">
                  <div className="grid gap-1 text-xs">
                    <div className="flex gap-2"><span className="text-zinc-500 w-20">Agent ID</span><span className="text-zinc-300 font-mono">{agent.agentId}</span></div>
                    <div className="flex gap-2"><span className="text-zinc-500 w-20">Wallet</span><span className="text-zinc-300 font-mono">{agent.wallet.slice(0,8)}…{agent.wallet.slice(-4)}</span></div>
                    {agent.metadata?.tags && (
                      <div className="flex gap-2"><span className="text-zinc-500 w-20">Tags</span>
                        <div className="flex gap-1 flex-wrap">{agent.metadata.tags.map(t => (
                          <span key={t} className="rounded bg-white/8 px-1.5 py-0.5 text-zinc-400">{t}</span>
                        ))}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2">Capabilities</p>
                    <div className="space-y-2">
                      {agent.capabilities.map((cap) => (
                        <div key={cap.name} className="flex items-start justify-between rounded-lg bg-white/4 px-3 py-2 text-xs">
                          <div>
                            <span className="font-mono text-indigo-300">{cap.name}</span>
                            <p className="text-zinc-500 mt-0.5">{cap.description}</p>
                            <p className="text-zinc-600 font-mono mt-0.5 truncate max-w-xs">{cap.endpoint}</p>
                          </div>
                          <span className="ml-4 flex-shrink-0 text-zinc-400">
                            {lamportsToSol(cap.priceLamports)} SOL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {agents.length === 0 && (
            <div className="rounded-xl border border-white/8 bg-white/3 p-10 text-center text-sm text-zinc-500">
              No agents match the current filters.
            </div>
          )}
        </div>
      </div>
    );
  }
  