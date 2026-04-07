import { useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Filter } from "lucide-react";
import { Badge } from "../components/ui/Badge";
import { formatDistance } from "date-fns";

const MOCK_PAYMENTS = Array.from({ length: 20 }, (_, i) => ({
  id: `${Math.random().toString(36).slice(2, 10)}...${Math.random().toString(36).slice(2, 6)}`,
  payer: `${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 6)}`,
  payee: `${Math.random().toString(36).slice(2, 6)}...${Math.random().toString(36).slice(2, 6)}`,
  amount: (Math.random() * 5).toFixed(4),
  token: Math.random() > 0.5 ? "SOL" : "USDC",
  status: Math.random() > 0.05 ? "confirmed" : "failed",
  type: Math.random() > 0.5 ? "channel" : "direct",
  time: new Date(Date.now() - Math.random() * 86_400_000),
}));

type FilterStatus = "all" | "confirmed" | "failed";
type FilterType = "all" | "channel" | "direct";

export function PaymentsPage() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");

  const filtered = MOCK_PAYMENTS.filter(
    (p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      (typeFilter === "all" || p.type === typeFilter)
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Payments</h2>
          <p className="text-xs text-[#4b5080] mt-0.5">All x402 settlements on this node</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-[#1e1e2e] p-1">
            {(["all", "confirmed", "failed"] as FilterStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  statusFilter === s
                    ? "bg-[#1e1e2e] text-white"
                    : "text-[#4b5080] hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-md border border-[#1e1e2e] p-1">
            {(["all", "channel", "direct"] as FilterType[]).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  typeFilter === t
                    ? "bg-[#1e1e2e] text-white"
                    : "text-[#4b5080] hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e2e]">
              {["Tx ID", "Payer", "Payee", "Amount", "Type", "Status", "Time"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#4b5080] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e1e2e]">
            {filtered.map((tx) => (
              <tr key={tx.id} className="hover:bg-[#14141f] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-indigo-400">{tx.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#8b90b0]">{tx.payer}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#8b90b0]">{tx.payee}</td>
                <td className="px-4 py-3 font-mono text-xs text-white">
                  {tx.amount} {tx.token}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={tx.type === "channel" ? "indigo" : "default"}>
                    {tx.type}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={tx.status === "confirmed" ? "success" : "error"}>
                    {tx.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-[#4b5080]">
                  {formatDistance(tx.time, new Date(), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
