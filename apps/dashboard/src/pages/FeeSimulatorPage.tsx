import { useState, useMemo, useCallback } from 'react';

  const FEE_PRESETS = [
    { label: 'Micro task',        lamports: 20_000   },
    { label: 'Standard call',     lamports: 100_000  },
    { label: 'Heavy compute',     lamports: 500_000  },
    { label: 'Premium model',     lamports: 2_000_000 },
  ] as const;

  const SOL  = 1_000_000_000n;
  const BPS  = 10_000n;

  function protocolFee(amt: bigint)  { return (amt * 50n) / BPS; }
  function lamportsToSol(l: bigint, dp = 9) {
    const whole = l / SOL;
    const frac  = (l % SOL).toString().padStart(9, '0').slice(0, dp);
    return `${whole}.${frac}`;
  }
  function lamportsToUsd(l: bigint, price: number) {
    return ((Number(l) / 1e9) * price).toFixed(4);
  }

  interface BarProps { label: string; value: number; max: number; color: string; sublabel?: string }
  function Bar({ label, value, max, color, sublabel }: BarProps) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-400">
          <span>{label}{sublabel && <span className="text-zinc-600 ml-1">{sublabel}</span>}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/8">
          <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  export default function FeeSimulatorPage() {
    const [priceLamports, setPriceLamports] = useState(100_000);
    const [calls,         setCalls]         = useState(50);
    const [solPrice,      setSolPrice]      = useState(145);
    const [copied,        setCopied]        = useState(false);
    const [exported,      setExported]      = useState(false);

    const n  = BigInt(calls);
    const pL = BigInt(priceLamports);

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

    const savings     = direct.total > channel.total ? direct.total - channel.total : 0n;
    const breakEven   = 2;
    const isChannel   = channel.total <= direct.total;
    const maxVal      = Number(direct.payment > channel.payment ? direct.payment : channel.payment);

    // ── Share link ──────────────────────────────────────────────────────────────
    const handleShare = useCallback(() => {
      const params = new URLSearchParams({
        price: String(priceLamports),
        calls: String(calls),
        sol:   String(solPrice),
      });
      navigator.clipboard.writeText(`${window.location.origin}/fees?${params}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, [priceLamports, calls, solPrice]);

    // ── Export JSON ─────────────────────────────────────────────────────────────
    const handleExport = useCallback(() => {
      const payload = {
        inputs:  { pricePerCallLamports: priceLamports, calls, solPriceUsd: solPrice },
        direct:  {
          totalCostLamports:  direct.total.toString(),
          totalCostSol:       lamportsToSol(direct.total),
          totalCostUsd:       lamportsToUsd(direct.total, solPrice),
          costPerCallLamports: calls > 0 ? (direct.total / n).toString() : '0',
          breakdown: {
            paymentLamports:      direct.payment.toString(),
            protocolFeeLamports:  direct.fee.toString(),
            txFeeLamports:        direct.txFee.toString(),
          },
        },
        channel: {
          totalCostLamports:  channel.total.toString(),
          totalCostSol:       lamportsToSol(channel.total),
          totalCostUsd:       lamportsToUsd(channel.total, solPrice),
          costPerCallLamports: calls > 0 ? (channel.total / n).toString() : '0',
          breakdown: {
            paymentLamports:      channel.payment.toString(),
            protocolFeeLamports:  channel.fee.toString(),
            openCloseFeeLamports: channel.openClose.toString(),
          },
        },
        recommendation: isChannel ? 'channel' : 'direct',
        savingsLamports: savings.toString(),
        breakEvenCalls:  breakEven,
        generatedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'aeeron-fee-estimate.json'; a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    }, [priceLamports, calls, solPrice, direct, channel, isChannel, savings, n]);

    return (
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">Fee Simulator</h1>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">v1.0</span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">Estimate x402 costs for direct payments vs payment channels.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
              {exported ? '✓ Exported' : '↓ Export JSON'}
            </button>
            <button onClick={handleShare}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors">
              {copied ? '✓ Copied!' : '⤴ Share link'}
            </button>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Price per call (lamports)</label>
            <div className="flex flex-wrap gap-1">
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
            <p className="text-[10px] text-zinc-500">{lamportsToSol(BigInt(priceLamports), 6)} SOL per call</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">Number of calls — <span className="text-white font-semibold">{calls}</span></label>
            <input type="range" min={1} max={500} value={calls}
              onChange={(e) => setCalls(Number(e.target.value))}
              className="w-full accent-indigo-500 mt-2" />
            <div className="flex justify-between text-[10px] text-zinc-600"><span>1</span><span>500</span></div>
            {calls > breakEven && (
              <p className="text-[10px] text-emerald-400">Channel mode saves {lamportsToSol(savings, 6)} SOL at this volume.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400">SOL price (USD)</label>
            <input type="number" value={solPrice} min={1} step={1}
              onChange={(e) => setSolPrice(Number(e.target.value))}
              className="w-full rounded-lg bg-white/6 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
            <p className="text-[10px] text-zinc-500">used for USD column only</p>
          </div>
        </div>

        {/* Recommendation banner */}
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${
          isChannel
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
        }`}>
          {isChannel
            ? `✦ Use a payment channel — saves ${lamportsToSol(savings, 6)} SOL ($${lamportsToUsd(savings, solPrice)}) over ${calls} calls. Break-even at ${breakEven} calls.`
            : `✦ Direct pay is cheaper for ${calls} call${calls !== 1 ? 's' : ''}. Channels become cost-effective after ${breakEven} calls.`
          }
        </div>

        {/* Side-by-side cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            {
              title: 'Direct Pay', mode: 'direct' as const,
              rows: [
                { label:'Agent payment',     sublabel:'price × calls', val: direct.payment  },
                { label:'Protocol fee',      sublabel:'0.5%',          val: direct.fee      },
                { label:'Tx fees',           sublabel:'5k × calls',    val: direct.txFee    },
              ],
              total: direct.total,
            },
            {
              title: 'Payment Channel', mode: 'channel' as const,
              rows: [
                { label:'Channel deposit',   sublabel:'price × calls', val: channel.payment   },
                { label:'Protocol fee',      sublabel:'0.5%',          val: channel.fee       },
                { label:'Open + close tx',   sublabel:'fixed 10k',     val: channel.openClose },
              ],
              total: channel.total,
            },
          ] as const).map(({ title, mode, rows, total }) => {
            const recommended = (mode === 'channel' && isChannel) || (mode === 'direct' && !isChannel);
            return (
              <div key={mode} className={`rounded-xl border p-4 space-y-4 transition-colors ${
                recommended ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/8 bg-white/3'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-white">{title}</span>
                  {recommended && (
                    <span className="text-[10px] rounded-full bg-indigo-500/20 px-2 py-0.5 text-indigo-300">Recommended</span>
                  )}
                </div>
                <div className="space-y-2">
                  {rows.map((r) => (
                    <Bar key={r.label} label={r.label} sublabel={r.sublabel} value={Number(r.val)} max={maxVal} color="bg-indigo-500" />
                  ))}
                </div>
                <div className="border-t border-white/8 pt-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total</span>
                    <span className="text-white font-semibold">{lamportsToSol(total)} SOL</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600">USD</span>
                    <span className="text-zinc-400">${lamportsToUsd(total, solPrice)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600">Per call</span>
                    <span className="text-zinc-400">{calls > 0 ? lamportsToSol(total / n, 7) : '—'} SOL</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary table */}
        <div className="rounded-xl border border-white/8 bg-white/3 p-4">
          <p className="text-xs font-medium text-zinc-400 mb-3">Cost summary</p>
          <table className="w-full text-xs">
            <thead><tr className="text-zinc-600">
              <th className="text-left pb-2 font-normal">Mode</th>
              <th className="text-right pb-2 font-normal">Total (SOL)</th>
              <th className="text-right pb-2 font-normal">Total (USD)</th>
              <th className="text-right pb-2 font-normal">Per call (SOL)</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {[
                { label:'Direct pay',      total: direct.total  },
                { label:'Payment channel', total: channel.total },
              ].map(({ label, total: t }) => (
                <tr key={label} className="text-zinc-300">
                  <td className="py-2">{label}</td>
                  <td className="py-2 text-right font-mono">{lamportsToSol(t, 7)}</td>
                  <td className="py-2 text-right font-mono">${lamportsToUsd(t, solPrice)}</td>
                  <td className="py-2 text-right font-mono">{calls > 0 ? lamportsToSol(t / n, 7) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  