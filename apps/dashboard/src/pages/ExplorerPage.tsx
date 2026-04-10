import { useState } from "react";
import { Search, ExternalLink, GitBranch, Hash, Receipt } from "lucide-react";
import { Badge } from "../components/ui/Badge";

type SearchMode = "channel" | "nonce" | "tx";

export function ExplorerPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("channel");
  const [result, setResult] = useState<null | "found" | "not-found">(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setResult(query.length > 20 ? "found" : "not-found");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-base font-semibold text-white">Protocol Explorer</h2>
        <p className="text-xs text-[#4b5080] mt-0.5">
          Look up channels, nonces, and receipts by address or hash
        </p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        {([
          { id: "channel", label: "Channel", icon: GitBranch },
          { id: "nonce", label: "Nonce", icon: Hash },
          { id: "tx", label: "Transaction", icon: Receipt },
        ] as { id: SearchMode; label: string; icon: any }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setMode(id); setResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-all ${
              mode === id
                ? "border-indigo-500/40 bg-indigo-600/15 text-indigo-300"
                : "border-[#1e1e2e] text-[#4b5080] hover:text-white hover:border-[#2e2e3e]"
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Search input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5080]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              mode === "channel"
                ? "Channel PDA address (base58)..."
                : mode === "nonce"
                ? "Nonce hex (64 characters)..."
                : "Transaction signature (base58)..."
            }
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#1e1e2e] bg-[#0f0f1a] text-white text-sm placeholder:text-[#4b5080] focus:outline-none focus:border-indigo-500/50 transition-colors font-mono"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-sm hover:bg-indigo-600/30 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Result */}
      {result === "not-found" && (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] p-6 text-center">
          <p className="text-sm text-[#4b5080]">No {mode} found for the given query.</p>
        </div>
      )}

      {result === "found" && mode === "channel" && (
        <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] p-5 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Payment Channel</h3>
            <div className="flex items-center gap-2">
              <Badge variant="success">open</Badge>
              <a
                href={`https://explorer.solana.com/address/${query}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4b5080] hover:text-white transition-colors"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Address", value: query.slice(0, 24) + "...", mono: true },
              { label: "Token", value: "SOL" },
              { label: "Payer", value: "9Fh2...7kLm", mono: true },
              { label: "Payee", value: "4aRw...8nPz", mono: true },
              { label: "Balance", value: "2.5 SOL", mono: true },
              { label: "Available", value: "1.38 SOL", mono: true },
              { label: "Settled", value: "1.12 SOL", mono: true },
              { label: "Sequence", value: "47", mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div className="text-[10px] uppercase tracking-wider text-[#4b5080] mb-0.5">{label}</div>
                <div className={`text-xs text-white ${mono ? "font-mono" : ""}`}>{value}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#4b5080] mb-1">Utilization</div>
            <div className="h-1.5 rounded-full bg-[#1e1e2e]">
              <div className="h-full w-[45%] rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
