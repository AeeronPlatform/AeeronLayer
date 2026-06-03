import { useMemo, useState } from 'react';

  type Range = '7d' | '30d' | '90d';

  interface DataPoint { label: string; payments: number; volume: number; agents: number }

  function generateSeries(days: number): DataPoint[] {
    const now = Date.now();
    return Array.from({ length: days }, (_, i) => {
      const d    = new Date(now - (days - 1 - i) * 86_400_000);
      const label = d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const base  = 80 + Math.sin(i / 3) * 30 + i * 2;
      return {
        label,
        payments: Math.round(base + Math.random() * 20),
        volume:   Math.round((base * 0.0001 + Math.random() * 0.002) * 1e9) / 1e9,
        agents:   Math.min(3 + Math.floor(i / 10), 12),
      };
    });
  }

  const SERIES: Record<Range, DataPoint[]> = {
    '7d':  generateSeries(7),
    '30d': generateSeries(30),
    '90d': generateSeries(90),
  };

  interface SparklineProps {
    data: number[];
    color: string;
    height?: number;
  }
  function Sparkline({ data, color, height = 40 }: SparklineProps) {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 200;
    const h = height;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    }).join(' ');
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }

  interface StatCardProps {
    title: string;
    value: string;
    delta: string;
    positive: boolean;
    sparkData: number[];
    color: string;
  }
  function StatCard({ title, value, delta, positive, sparkData, color }: StatCardProps) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
        <div className="flex justify-between items-start">
          <span className="text-xs text-zinc-500">{title}</span>
          <span className={`text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {positive ? '↑' : '↓'} {delta}
          </span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <Sparkline data={sparkData} color={color} />
      </div>
    );
  }

  function BarChart({ data, field, color }: { data: DataPoint[]; field: 'payments' | 'volume'; color: string }) {
    const vals = data.map((d) => d[field]);
    const max  = Math.max(...vals);
    const show = data.length > 30 ? data.filter((_, i) => i % 3 === 0) : data;

    return (
      <div className="flex items-end gap-0.5 h-24 w-full">
        {show.map((d, i) => {
          const pct = max > 0 ? (d[field] / max) * 100 : 0;
          return (
            <div key={i} className="group relative flex-1 flex flex-col justify-end" title={d.label}>
              <div
                className={`rounded-sm ${color} opacity-70 group-hover:opacity-100 transition-opacity`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
    );
  }

  export default function AnalyticsPage() {
    const [range, setRange] = useState<Range>('30d');
    const series = SERIES[range];

    const totals = useMemo(() => ({
      payments: series.reduce((s, d) => s + d.payments, 0),
      volume:   series.reduce((s, d) => s + d.volume, 0).toFixed(4),
      agents:   series[series.length - 1].agents,
      avgCallsPerDay: Math.round(series.reduce((s, d) => s + d.payments, 0) / series.length),
    }), [series]);

    const half = Math.floor(series.length / 2);
    const first = series.slice(0, half).reduce((s, d) => s + d.payments, 0);
    const second = series.slice(half).reduce((s, d) => s + d.payments, 0);
    const deltaPayments = first > 0 ? (((second - first) / first) * 100).toFixed(1) : '0';
    const deltaPositive = second >= first;

    const topAgents = [
      { name: 'Text Summarizer',   calls: Math.round(totals.payments * 0.38), pct: 38 },
      { name: 'Embedding Service', calls: Math.round(totals.payments * 0.31), pct: 31 },
      { name: 'Code Reviewer',     calls: Math.round(totals.payments * 0.19), pct: 19 },
      { name: 'Other',             calls: Math.round(totals.payments * 0.12), pct: 12 },
    ];

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Analytics</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Payment volume and agent activity</p>
          </div>
          <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
            {(['7d','30d','90d'] as Range[]).map((r) => (
              <button key={r} onClick={() => setRange(r)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  range === r ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}>{r}</button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Total Payments"    value={totals.payments.toLocaleString()}
            delta={`${Math.abs(Number(deltaPayments))}%`} positive={deltaPositive}
            sparkData={series.map((d) => d.payments)} color="#6366f1" />
          <StatCard title="Volume (SOL)"      value={totals.volume}
            delta="3.2%" positive={true}
            sparkData={series.map((d) => d.volume)} color="#10b981" />
          <StatCard title="Active Agents"     value={String(totals.agents)}
            delta="2" positive={true}
            sparkData={series.map((d) => d.agents)} color="#f59e0b" />
          <StatCard title="Avg Calls / Day"   value={String(totals.avgCallsPerDay)}
            delta="8.4%" positive={deltaPositive}
            sparkData={series.map((d) => d.payments)} color="#8b5cf6" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-400">Payment calls over time</p>
            <BarChart data={series} field="payments" color="bg-indigo-500" />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>{series[0].label}</span>
              <span>{series[series.length - 1].label}</span>
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-400">SOL volume over time</p>
            <BarChart data={series} field="volume" color="bg-emerald-500" />
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>{series[0].label}</span>
              <span>{series[series.length - 1].label}</span>
            </div>
          </div>
        </div>

        {/* Top agents */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-400">Top agents by call volume</p>
          <div className="space-y-3">
            {topAgents.map((a) => (
              <div key={a.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">{a.name}</span>
                  <span className="text-zinc-500">{a.calls.toLocaleString()} calls · {a.pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${a.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  