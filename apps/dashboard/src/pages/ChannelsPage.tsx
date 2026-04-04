import { useState } from "react";
import { GitBranch, Plus, ChevronDown, ChevronRight, Zap, Lock } from "lucide-react";
import { Badge } from "../components/ui/Badge";

const MOCK_CHANNELS = [
  {
    address: "8xKpM3nQrRtT...7mLo",
    payer: "9Fh2ZwKm...7kLm",
    payee: "4aRwYnPz...8nPz",
    balance: 2.5,
    settled: 1.12,
    available: 1.38,
    sequence: 47,
    expiry: null,
    isOpen: true,
    tokenSymbol: "SOL",
  },
  {
    address: "3mQtTvAeZw...9vAe",
    payer: "2bNzXsJk...5wJk",
    payee: "7cXpEqRm...1eRm",
    balance: 500,
    settled: 380,
    available: 120,
    sequence: 192,
    expiry: new Date(Date.now() + 86_400_000 * 3),
    isOpen: true,
    tokenSymbol: "USDC",
  },
  {
    address: "1pLoGtNwQe...7gTn",
    payer: "6eKzMvXv...2mXv",
    payee: "3fPrCdJd...9jCd",
    balance: 1.0,
    settled: 1.0,
    available: 0,
    sequence: 88,
    expiry: new Date(Date.now() - 3600_000),
    isOpen: false,
    tokenSymbol: "SOL",
  },
];

export function ChannelsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Payment Channels</h2>
          <p className="text-xs text-[#4b5080] mt-0.5">
            Pre-funded channel vaults for repeated micro-payments
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-600/30 transition-colors">
          <Plus size={14} />
          Open Channel
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open Channels", value: "2", icon: GitBranch, color: "text-indigo-400" },
          { label: "Total Locked", value: "3.5 SOL", icon: Lock, color: "text-violet-400" },
          { label: "Total Settled", value: "1.5 SOL", icon: Zap, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-lg border border-[#1e1e2e] bg-[#0f0f1a] px-4 py-3 flex items-center gap-3">
            <Icon size={16} className={color} />
            <div>
              <div className="text-xs text-[#4b5080]">{label}</div>
              <div className="text-sm font-semibold text-white font-mono">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Channel list */}
      <div className="space-y-2">
        {MOCK_CHANNELS.map((ch) => (
          <div key={ch.address} className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] overflow-hidden">
            <button
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#14141f] transition-colors"
              onClick={() => setExpanded(expanded === ch.address ? null : ch.address)}
            >
              <div className="flex items-center gap-2 flex-1">
                {expanded === ch.address ? (
                  <ChevronDown size={14} className="text-[#4b5080]" />
                ) : (
                  <ChevronRight size={14} className="text-[#4b5080]" />
                )}
                <span className="font-mono text-xs text-[#8b90b0]">{ch.address}</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-[#4b5080]">Available</div>
                  <div className="font-mono text-sm text-white">
                    {ch.available} {ch.tokenSymbol}
                  </div>
                </div>
                <Badge variant={ch.isOpen ? (ch.available === 0 ? "warning" : "success") : "error"}>
                  {ch.isOpen ? (ch.available === 0 ? "drained" : "open") : "closed"}
                </Badge>
              </div>
            </button>

            {expanded === ch.address && (
              <div className="border-t border-[#1e1e2e] px-5 py-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: "Payer", value: ch.payer, mono: true },
                  { label: "Payee", value: ch.payee, mono: true },
                  { label: "Token", value: ch.tokenSymbol },
                  { label: "Balance", value: `${ch.balance} ${ch.tokenSymbol}`, mono: true },
                  { label: "Settled", value: `${ch.settled} ${ch.tokenSymbol}`, mono: true },
                  { label: "Sequence", value: String(ch.sequence), mono: true },
                  {
                    label: "Expiry",
                    value: ch.expiry
                      ? ch.expiry < new Date()
                        ? "Expired"
                        : ch.expiry.toLocaleDateString()
                      : "None",
                  },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <div className="text-[10px] uppercase tracking-wider text-[#4b5080] mb-0.5">{label}</div>
                    <div className={`text-xs text-white ${mono ? "font-mono" : ""}`}>{value}</div>
                  </div>
                ))}

                <div className="col-span-full">
                  <div className="text-[10px] uppercase tracking-wider text-[#4b5080] mb-1">Utilization</div>
                  <div className="h-1.5 rounded-full bg-[#1e1e2e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                      style={{ width: `${(ch.settled / ch.balance) * 100}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-[#4b5080] mt-1">
                    {((ch.settled / ch.balance) * 100).toFixed(1)}% settled
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
