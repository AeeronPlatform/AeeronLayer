import { useState, useMemo } from 'react';

  const FEE_PRESETS = [
    { label: 'Micro task (summarize)',   lamports: 20_000  },
    { label: 'Standard inference',       lamports: 100_000 },
    { label: 'Heavy compute (codegen)',  lamports: 500_000 },
    { label: 'Premium model call',       lamports: 2_000_000 },
  ] as const;

  const SOL = 1_000_000_000n;
  const BPS  = 10_000n;

  function protocolFee(amt: bigint) { return (amt * 50n) / BPS; }
  function lamportsToSol(l: bigint) {
    const whole = l / SOL;
    const frac  = (l % SOL).toString().padStart(9, '0');
    return `${whole}.${frac}`;
  }
  function lamportsToUsd(l: bigint, solPrice: number) {
    return ((Number(l) / 1e9) * solPrice).toFixed(4);
  }

  interface BarProps { label: string; value: number; max: number; color: string }
  function Bar({ label, value, max, color }: BarProps) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{label}</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/8">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  export default function FeeSimulatorPage() {
    const [priceLamports, setPriceLamports] = useState(100_000);
    const [calls, setCalls]                 = useState(50);
    const [solPrice, setSolPrice]           = useState(145);

    const n   = BigInt(calls);
    const pL  = BigInt(priceLamports);

    const direct = useMemo(() => {
      const payment  = pL * n;
      const fee      = protocolFee(payment);
      const txFee    = 5_000n * n;
      const total    = payment + fee + txFee;
      return { payment, fee, txFee, total };
    }, [pL, n]);

    const channel = useMemo(() => {
      const payment   = pL * n;
      const fee       = protocolFee(payment);
      const openClose = 10_000n;
      const total     = payment + fee + openClose;
      return { payment, fee, openClose, total };
    }, [pL, n]);

    const savings      = direct.total > channel.total ? direct.total - channel.total : 0n;
    const breakEven    = 2; // openClose(10k) / baseTx(5k)
    const isChannel    = channel.total <= direct.total;
    const maxComponent = Number(direct.payment > channel.payment ? direct.payment : channel.payment);

    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fee Simulator</h1>
          <p className="text-sm text-zinc-400 mt-1">Estimate x402 costs for direct payments vs payment channels.</p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Price per call</label>
            <div className="flex flex-wrap gap-1 mb-1">
              {FEE_PRESETS.map((p) => (
                <button key={p.label} onClick={() => setPriceLamports(p.lamports)}
                  className={`rounded px-2 py-0.5 text-[10px] transition-colors ${
                    priceLamports === p.lamports
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/8 text-zinc-400 hover:text-white'
                  }`}>{p.label}</button>
              ))}
            </div>
            <input type="number" value={priceLamports} min={100} step={1000}
              onChange={(e) => setPriceLamports(Number(e.target.value))}
              className="w-full rounded-lg bg-white/6 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            <p className="text-[10px] text-zinc-500">{lamportsToSol(BigInt(priceLamports))} SOL / call</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Number of calls</label>
            <input type="range" min={1} max={500} value={calls}
              onChange={(e) => setCalls(Number(e.target.value))}
              className="w-full accent-indigo-500 mt-3" />
            <p className="text-center text-2xl font-bold text-white">{calls}</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">SOL price (USD)</label>
            <input type="number" value={solPrice} min={1} step={1}
              onChange={(e) => setSolPrice(Number(e.target.value))}
              className="w-full rounded-lg bg-white/6 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            <p className="text-[10px] text-zinc-500">for USD estimates</p>
          </div>
        </div>

        {/* Recommendation banner */}
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
          isChannel
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
            : 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
        }`}>
          {isChannel
            ? `✦ Use a payment channel — saves ${lamportsToSol(savings)} SOL ($${lamportsToUsd(savings, solPrice)}) over ${calls} calls. Break-even at ${breakEven} calls.`
            : `✦ Direct pay is cheaper for ${calls} call${calls !== 1 ? 's' : ''}. Open a channel when you exceed ${breakEven} calls.`
          }
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              title: 'Direct Pay', mode: 'direct' as const,
              rows: [
                { label:'Agent payment', val: direct.payment },
                { label:'Protocol fee (0.5%)', val: direct.fee },
                { label:'Tx fees (5k × calls)', val: direct.txFee },
              ],
              total: direct.total,
            },
            {
              title: 'Payment Channel', mode: 'channel' as const,
              rows: [
                { label:'Channel deposit', val: channel.payment },
                { label:'Protocol fee (0.5%)', val: channel.fee },
                { label:'Open + close tx', val: channel.openClose },
              ],
              total: channel.total,
            },
          ].map(({ title, mode, rows, total }) => (
            <div key={mode} className={`rounded-xl border p-4 space-y-4 ${
              (mode === 'channel' && isChannel) || (mode === 'direct' && !isChannel)
                ? 'border-indigo-500/40 bg-indigo-500/5'
                : 'border-white/8 bg-white/3'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">{title}</span>
                {((mode === 'channel' && isChannel) || (mode === 'direct' && !isChannel)) && (
                  <span className="text-[10px] rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-300">Recommended</span>
                )}
              </div>
              <div className="space-y-2">
                {rows.map((r) => (
                  <Bar key={r.label} label={r.label} value={Number(r.val)} max={maxComponent} color="bg-indigo-500" />
                ))}
              </div>
              <div className="border-t border-white/8 pt-3 space-y-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Total</span>
                  <span className="text-white font-semibold">{lamportsToSol(total)} SOL</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">≈ USD</span>
                  <span className="text-zinc-400">${lamportsToUsd(total, solPrice)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600">Per call</span>
                  <span className="text-zinc-400">{calls > 0 ? lamportsToSol(total / n) : '—'} SOL</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  