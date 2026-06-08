import { useState } from 'react';

  type AgentStatus = 'online' | 'idle' | 'offline';

  interface Agent {
    id:           string;
    name:         string;
    version:      string;
    status:       AgentStatus;
    capabilities: string[];
    totalPaid:    number;   // lamports
    lastSeen:     string;   // ISO
    wallet:       string;
    endpoint:     string;
  }

  const SEED: Agent[] = [
    {
      id: 'agent_summarizer_v1', name: 'Summarizer', version: '1.3.0', status: 'online',
      capabilities: ['summarize', 'extract_keywords', 'classify'],
      totalPaid: 4_820_000, lastSeen: new Date(Date.now() - 12_000).toISOString(),
      wallet: 'FxKc...9mPQ', endpoint: 'https://agents.aeeron.xyz/summarizer',
    },
    {
      id: 'agent_embedder_v2', name: 'Embedder', version: '2.0.1', status: 'online',
      capabilities: ['embed', 'semantic_search', 'cluster'],
      totalPaid: 2_100_000, lastSeen: new Date(Date.now() - 38_000).toISOString(),
      wallet: 'BpRt...4nWs', endpoint: 'https://agents.aeeron.xyz/embedder',
    },
    {
      id: 'agent_code_reviewer', name: 'Code Reviewer', version: '0.9.4', status: 'idle',
      capabilities: ['review_code', 'suggest_refactor', 'detect_bugs'],
      totalPaid: 980_000, lastSeen: new Date(Date.now() - 4 * 60_000).toISOString(),
      wallet: 'HqZu...7cLv', endpoint: 'https://agents.aeeron.xyz/code-reviewer',
    },
    {
      id: 'agent_translator_v1', name: 'Translator', version: '1.1.2', status: 'offline',
      capabilities: ['translate', 'detect_language'],
      totalPaid: 320_000, lastSeen: new Date(Date.now() - 3 * 3600_000).toISOString(),
      wallet: 'CwNm...2xRj', endpoint: 'https://agents.aeeron.xyz/translator',
    },
    {
      id: 'agent_ocr_v1', name: 'OCR Agent', version: '1.0.0', status: 'online',
      capabilities: ['extract_text', 'parse_table', 'pdf_to_text'],
      totalPaid: 1_540_000, lastSeen: new Date(Date.now() - 5_000).toISOString(),
      wallet: 'DpXa...8kTq', endpoint: 'https://agents.aeeron.xyz/ocr',
    },
  ];

  const STATUS: Record<AgentStatus, { dot: string; label: string }> = {
    online:  { dot: 'bg-emerald-400', label: 'Online'  },
    idle:    { dot: 'bg-amber-400',   label: 'Idle'    },
    offline: { dot: 'bg-zinc-600',    label: 'Offline' },
  };

  function lamports(l: number) {
    return (l / 1e9).toFixed(4) + ' SOL';
  }
  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60)   return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }

  export default function AgentsPage() {
    const [search,    setSearch]    = useState('');
    const [statusFilter, setStatus] = useState<AgentStatus | 'all'>('all');
    const [expanded,  setExpanded]  = useState<string | null>(null);

    const agents = SEED.filter((a) => {
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || a.name.toLowerCase().includes(q) || a.id.includes(q) || a.capabilities.some((c) => c.includes(q));
      return matchStatus && matchSearch;
    });

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Agents</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Registered agents connected to the Aeeron Gateway.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {SEED.filter((a) => a.status === 'online').length} online
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or capabilities…"
            className="flex-1 min-w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
          />
          {(['all', 'online', 'idle', 'offline'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-indigo-500/60 bg-indigo-600/20 text-indigo-300'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
              }`}>
              {s === 'all' ? 'All' : STATUS[s].label}
            </button>
          ))}
        </div>

        {/* Agent list */}
        <div className="space-y-2">
          {agents.map((agent) => {
            const st = STATUS[agent.status];
            const open = expanded === agent.id;
            return (
              <div key={agent.id}
                className="rounded-xl border border-white/6 bg-white/3 overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? null : agent.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-white/4 transition-colors">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{agent.name}</span>
                      <span className="text-[10px] text-zinc-600">v{agent.version}</span>
                      <span className="text-[10px] font-mono text-zinc-600">{agent.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {agent.capabilities.map((cap) => (
                        <span key={cap} className="rounded bg-indigo-500/10 px-1.5 py-px text-[9px] text-indigo-300">{cap}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right text-xs text-zinc-500 space-y-0.5">
                    <div>{lamports(agent.totalPaid)}</div>
                    <div className="text-[10px]">{timeAgo(agent.lastSeen)}</div>
                  </div>
                  <span className="text-zinc-600 text-xs">{open ? '▲' : '▼'}</span>
                </button>
                {open && (
                  <div className="border-t border-white/6 px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                    {[
                      ['Wallet',   agent.wallet],
                      ['Endpoint', agent.endpoint],
                      ['Status',   st.label],
                      ['Last seen',timeAgo(agent.lastSeen)],
                      ['Total paid', lamports(agent.totalPaid)],
                      ['Agent ID', agent.id],
                    ].map(([k, v]) => (
                      <div key={k} className="flex gap-2">
                        <span className="text-zinc-600 w-20 flex-shrink-0">{k}</span>
                        <span className="text-zinc-300 font-mono truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {agents.length === 0 && (
            <p className="py-12 text-center text-sm text-zinc-600">No agents found.</p>
          )}
        </div>
      </div>
    );
  }
  