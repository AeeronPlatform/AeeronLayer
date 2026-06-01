import { useState } from 'react';
  import { SwapWidget, AERN_MINT, USDC_MINT, SOL_MINT } from '../components/ui/SwapWidget';

  const STATS = [
    { label: 'Total Supply',       value: '1,000,000,000',  unit: 'AERN' },
    { label: 'Circulating Supply', value: 'TGE',            unit: '—'    },
    { label: 'Token Standard',     value: 'SPL Token-2022', unit: ''     },
    { label: 'Decimals',           value: '9',              unit: ''     },
  ];

  const ALLOCATIONS = [
    { label: 'Protocol Treasury',       pct: 30, color: '#6366f1' },
    { label: 'Ecosystem & Grants',      pct: 25, color: '#8b5cf6' },
    { label: 'Community & Incentives',  pct: 20, color: '#a78bfa' },
    { label: 'Team & Contributors',     pct: 15, color: '#c4b5fd' },
    { label: 'Strategic Reserves',      pct: 10, color: '#ddd6fe' },
  ];

  type SwapPair = 'SOL' | 'USDC';

  export default function TokenPage() {
    const [pair, setPair] = useState<SwapPair>('SOL');

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">AERN Token</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Native utility and governance token of the Aeeron protocol.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {s.value} <span className="text-xs font-normal text-zinc-400">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Distribution */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-300">Token Distribution</h2>
            <div className="space-y-3">
              {ALLOCATIONS.map((a) => (
                <div key={a.label}>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>{a.label}</span>
                    <span>{a.pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/8">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${a.pct}%`, background: a.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Swap widget */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-zinc-300">Swap</h2>
              <div className="flex gap-1 rounded-lg border border-white/10 p-0.5">
                {(['SOL', 'USDC'] as SwapPair[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPair(p)}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      pair === p ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <SwapWidget
              defaultInputMint={pair === 'SOL' ? SOL_MINT : USDC_MINT}
              defaultOutputMint={AERN_MINT}
            />
          </div>
        </div>
      </div>
    );
  }
  