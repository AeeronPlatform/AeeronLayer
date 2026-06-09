import { useMemo, useState } from 'react';

  // ── Types ─────────────────────────────────────────────────────────────────────
  interface DayBucket {
    date:           string; // YYYY-MM-DD
    payments:       number;
    volumeLamports: number;
    feesLamports:   number;
    uniqueAgents:   number;
  }

  interface AgentStat {
    agentId:        string;
    name:           string;
    payments:       number;
    volumeLamports: number;
  }

  type Range = '7d' | '14d' | '30d';

  // ── Seed data ─────────────────────────────────────────────────────────────────
  function makeBuckets(days: number): DayBucket[] {
    const out: DayBucket[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      const base = 40 + Math.round(Math.sin(i / 3) * 18 + Math.random() * 25);
      const vol  = base * 100_000 + Math.round(Math.random() * 500_000);
      out.push({
        date:           d.toISOString().slice(0, 10),
        payments:       base,
        volumeLamports: vol,
        feesLamports:   Math.round(vol * 0.003),
        uniqueAgents:   3 + Math.round(Math.random() * 3),
      });
    }
    return out;
  }

  const TOP_AGENTS: AgentStat[] = [
    { agentId:'agent_summarizer_v1', name:'Summarizer',    payments:412, volumeLamports:41_200_000 },
    { agentId:'agent_embedder_v2',   name:'Embedder',      payments:289, volumeLamports:28_900_000 },
    { agentId:'agent_ocr_v1',        name:'OCR Agent',     payments:174, volumeLamports:17_400_000 },
    { agentId:'agent_code_reviewer', name:'Code Reviewer', payments: 98, volumeLamports: 9_800_000 },
    { agentId:'agent_translator_v1', name:'Translator',    payments: 43, volumeLamports: 4_300_000 },
  ];

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function sol(l: number) { return (l / 1e9).toFixed(4); }
  function fmtNum(n: number) { return n.toLocaleString('en-US'); }

  function Sparkline({ data, color = '#818cf8' }: { data: number[]; color?: string }) {
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * 200;
      const y = 40 - (v / max) * 36;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox="0 0 200 40" className="w-full h-10" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }

  function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="h-1.5 rounded-full bg-white/6 overflow-hidden w-full">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  // ── Component ─────────────────────────────────────────────────────────────────
  export default function AnalyticsPage() {
    const [range, setRange] = useState<Range>('14d');

    const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
    const buckets = useMemo(() => makeBuckets(days), [days]);

    const totals = useMemo(() => ({
      payments:       buckets.reduce((s, b) => s + b.payments, 0),
      volumeLamports: buckets.reduce((s, b) => s + b.volumeLamports, 0),
      feesLamports:   buckets.reduce((s, b) => s + b.feesLamports, 0),
      avgAgents:      (buckets.reduce((s, b) => s + b.uniqueAgents, 0) / buckets.length).toFixed(1),
    }), [buckets]);

    const maxVol  = Math.max(...buckets.map((b) => b.volumeLamports));
    const maxPay  = Math.max(...buckets.map((b) => b.payments));
    const maxAgent = Math.max(...TOP_AGENTS.map((a) => a.volumeLamports));

    const STATS = [
      { label:'Total payments',   value: fmtNum(totals.payments),            sub:'transactions',  spark: buckets.map((b) => b.payments),       color:'#818cf8' },
      { label:'Payment volume',   value: sol(totals.volumeLamports) + ' SOL', sub:'settled on-chain', spark: buckets.map((b) => b.volumeLamports), color:'#34d399' },
      { label:'Protocol fees',    value: sol(totals.feesLamports) + ' SOL',   sub:'0.3% of volume', spark: buckets.map((b) => b.feesLamports),   color:'#fb923c' },
      { label:'Avg active agents',value: totals.avgAgents + ' / day',         sub:'unique agents',  spark: buckets.map((b) => b.uniqueAgents),   color:'#38bdf8' },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Analytics</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Payment volume and agent activity across the Aeeron Gateway.</p>
          </div>
          <div className="flex gap-1">
            {(['7d', '14d', '30d'] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === r
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 space-y-2">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{s.label}</p>
              <p className="text-xl font-semibold text-white leading-none">{s.value}</p>
              <Sparkline data={s.spark} color={s.color} />
              <p className="text-[10px] text-zinc-600">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Volume bar chart */}
        <div className="rounded-xl border border-white/6 bg-white/3 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-white">Daily volume (SOL)</p>
          <div className="flex items-end gap-1 h-28">
            {buckets.map((b) => {
              const h = maxVol > 0 ? (b.volumeLamports / maxVol) * 100 : 0;
              return (
                <div key={b.date} className="group relative flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-indigo-500/70 hover:bg-indigo-400 transition-colors"
                    style={{ height: `${h}%`, minHeight: '2px' }}
                  />
                  <span className="text-[8px] text-zinc-700 group-hover:text-zinc-500 transition-colors hidden sm:block">
                    {b.date.slice(5)}
                  </span>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[10px] text-white whitespace-nowrap z-10">
                    {sol(b.volumeLamports)} SOL · {b.payments} txns
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top agents table */}
        <div className="rounded-xl border border-white/6 bg-white/3 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/6">
            <p className="text-sm font-medium text-white">Top agents by volume</p>
          </div>
          <div className="divide-y divide-white/5">
            {TOP_AGENTS.map((a, i) => (
              <div key={a.agentId} className="flex items-center gap-4 px-4 py-2.5">
                <span className="text-xs text-zinc-600 w-4 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{a.name}</p>
                  <p className="text-[10px] font-mono text-zinc-600">{a.agentId}</p>
                </div>
                <div className="w-28 space-y-1">
                  <MiniBar value={a.volumeLamports} max={maxAgent} color="bg-indigo-500" />
                </div>
                <div className="text-right">
                  <p className="text-xs text-white">{sol(a.volumeLamports)} SOL</p>
                  <p className="text-[10px] text-zinc-600">{fmtNum(a.payments)} payments</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  