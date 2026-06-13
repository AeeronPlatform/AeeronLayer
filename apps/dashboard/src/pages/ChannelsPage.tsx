import { useState } from 'react';

  type ChannelStatus = 'open' | 'draining' | 'closed';

  interface Channel {
    id:             string;
    initiator:      string;  // agent ID
    counterparty:   string;  // agent ID
    balanceLamports: number;
    depositLamports: number;
    txCount:         number;
    rail:            'sol' | 'spl';
    status:          ChannelStatus;
    openedAt:        string;
    lastActivityAt:  string;
  }

  const SEED: Channel[] = [
    {
      id: 'ch_3f8a2b1c', initiator: 'agent_summarizer_v1', counterparty: 'agent_embedder_v2',
      balanceLamports: 6_200_000, depositLamports: 10_000_000, txCount: 48, rail: 'sol',
      status: 'open',
      openedAt:       new Date(Date.now() - 4 * 3600_000).toISOString(),
      lastActivityAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    },
    {
      id: 'ch_9d7e5f4a', initiator: 'agent_ocr_v1', counterparty: 'agent_summarizer_v1',
      balanceLamports: 1_050_000, depositLamports: 5_000_000, txCount: 81, rail: 'sol',
      status: 'draining',
      openedAt:       new Date(Date.now() - 11 * 3600_000).toISOString(),
      lastActivityAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    },
    {
      id: 'ch_c2a4e6d8', initiator: 'agent_embedder_v2', counterparty: 'agent_code_reviewer',
      balanceLamports: 3_800_000, depositLamports: 4_000_000, txCount: 22, rail: 'spl',
      status: 'open',
      openedAt:       new Date(Date.now() - 1.5 * 3600_000).toISOString(),
      lastActivityAt: new Date(Date.now() - 1 * 60_000).toISOString(),
    },
    {
      id: 'ch_b1f3d5e7', initiator: 'agent_translator_v1', counterparty: 'agent_ocr_v1',
      balanceLamports: 0, depositLamports: 2_000_000, txCount: 34, rail: 'sol',
      status: 'closed',
      openedAt:       new Date(Date.now() - 26 * 3600_000).toISOString(),
      lastActivityAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    },
  ];

  const STATUS_STYLE: Record<ChannelStatus, { dot: string; badge: string; label: string }> = {
    open:     { dot:'bg-emerald-400', badge:'bg-emerald-500/15 text-emerald-300', label:'Open'     },
    draining: { dot:'bg-amber-400',   badge:'bg-amber-500/15  text-amber-300',   label:'Draining'  },
    closed:   { dot:'bg-zinc-600',    badge:'bg-zinc-700/50   text-zinc-500',    label:'Closed'    },
  };

  function sol(l: number) { return (l / 1e9).toFixed(4) + ' SOL'; }
  function pct(bal: number, dep: number) { return dep > 0 ? Math.round((bal / dep) * 100) : 0; }
  function timeAgo(iso: string) {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    return Math.floor(s / 3600) + 'h ago';
  }

  function BalanceBar({ balance, deposit }: { balance: number; deposit: number }) {
    const p = pct(balance, deposit);
    const color = p > 50 ? 'bg-emerald-500' : p > 20 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="space-y-0.5">
        <div className="h-1.5 w-full rounded-full bg-white/6 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{sol(balance)} left</span>
          <span>{p}%</span>
        </div>
      </div>
    );
  }

  export default function ChannelsPage() {
    const [statusFilter, setStatus] = useState<ChannelStatus | 'all'>('all');
    const [search, setSearch] = useState('');

    const channels = SEED.filter((ch) => {
      const matchStatus = statusFilter === 'all' || ch.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch = !q || ch.id.includes(q) || ch.initiator.includes(q) || ch.counterparty.includes(q);
      return matchStatus && matchSearch;
    });

    const summary = {
      open:     SEED.filter((c) => c.status === 'open').length,
      draining: SEED.filter((c) => c.status === 'draining').length,
      totalVol: SEED.reduce((s, c) => s + c.depositLamports, 0),
      totalTx:  SEED.reduce((s, c) => s + c.txCount, 0),
    };

    return (
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Channels</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Off-chain payment channels between agents settled on Aeeron.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:'Open channels',  value: summary.open,                    sub:'active'          },
            { label:'Draining',       value: summary.draining,                sub:'near empty'      },
            { label:'Total deposited',value: sol(summary.totalVol),           sub:'across all channels' },
            { label:'Total transfers',value: summary.totalTx.toLocaleString(),sub:'micro-payments'  },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-white/6 bg-white/3 px-4 py-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-semibold text-white mt-1">{c.value}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by channel ID or agent…"
            className="flex-1 min-w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500" />
          {(['all', 'open', 'draining', 'closed'] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'border-indigo-500/60 bg-indigo-600/20 text-indigo-300'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
              }`}>
              {s === 'all' ? 'All' : STATUS_STYLE[s].label}
            </button>
          ))}
        </div>

        {/* Channel list */}
        <div className="space-y-2">
          {channels.map((ch) => {
            const st = STATUS_STYLE[ch.status];
            return (
              <div key={ch.id} className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`h-2 w-2 flex-shrink-0 rounded-full ${st.dot}`} />
                  <span className="font-mono text-xs text-zinc-400">{ch.id}</span>
                  <span className={`rounded px-1.5 py-px text-[9px] font-medium ${st.badge}`}>{st.label}</span>
                  <span className="rounded bg-indigo-500/10 px-1.5 py-px text-[9px] text-indigo-300">{ch.rail.toUpperCase()}</span>
                  <span className="ml-auto text-[10px] text-zinc-600">{timeAgo(ch.lastActivityAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-300">{ch.initiator}</span>
                  <span className="text-zinc-600">↔</span>
                  <span className="text-zinc-300">{ch.counterparty}</span>
                  <span className="ml-auto text-zinc-500">{ch.txCount} transfers</span>
                </div>
                {ch.status !== 'closed' && (
                  <BalanceBar balance={ch.balanceLamports} deposit={ch.depositLamports} />
                )}
              </div>
            );
          })}
          {channels.length === 0 && (
            <p className="py-12 text-center text-sm text-zinc-600">No channels found.</p>
          )}
        </div>
      </div>
    );
  }
  