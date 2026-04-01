import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  GitBranch,
  Zap,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "../components/ui/StatCard";
import { Badge } from "../components/ui/Badge";
import { formatDistance } from "date-fns";

const MOCK_VOLUME_DATA = [
  { time: "00:00", volume: 12.4, settlements: 34 },
  { time: "04:00", volume: 8.1, settlements: 21 },
  { time: "08:00", volume: 31.7, settlements: 89 },
  { time: "12:00", volume: 48.2, settlements: 134 },
  { time: "16:00", volume: 39.6, settlements: 110 },
  { time: "20:00", volume: 55.1, settlements: 158 },
  { time: "24:00", volume: 42.3, settlements: 121 },
];

const MOCK_RECENT = [
  {
    id: "7xKp...3mQr",
    payer: "9Fh2...7kLm",
    payee: "4aRw...8nPz",
    amount: "0.0025 SOL",
    status: "confirmed",
    time: new Date(Date.now() - 42_000),
  },
  {
    id: "3mQt...9vAe",
    payer: "2bNz...5wJk",
    payee: "7cXp...1eRm",
    amount: "1.50 USDC",
    status: "confirmed",
    time: new Date(Date.now() - 91_000),
  },
  {
    id: "8sRe...2fYo",
    payer: "5kMw...3hBq",
    payee: "1dAe...6uNs",
    amount: "0.001 SOL",
    status: "confirmed",
    time: new Date(Date.now() - 145_000),
  },
  {
    id: "1pLo...7gTn",
    payer: "6eKz...2mXv",
    payee: "3fPr...9jCd",
    amount: "5.00 USDC",
    status: "confirmed",
    time: new Date(Date.now() - 280_000),
  },
  {
    id: "4qMv...5cWs",
    payer: "8hYn...4bSr",
    payee: "0gBk...7tZe",
    amount: "0.005 SOL",
    status: "pending",
    time: new Date(Date.now() - 12_000),
  },
];

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="24h Volume"
          value="237.5 SOL"
          change="12.4%"
          changePositive
          icon={TrendingUp}
          iconColor="text-indigo-400"
        />
        <StatCard
          label="Settlements"
          value="667"
          change="8.1%"
          changePositive
          icon={ArrowLeftRight}
          iconColor="text-violet-400"
        />
        <StatCard
          label="Open Channels"
          value="142"
          change="3"
          changePositive
          icon={GitBranch}
          iconColor="text-cyan-400"
        />
        <StatCard
          label="Avg Latency"
          value="410 ms"
          change="22 ms"
          changePositive={false}
          icon={Zap}
          iconColor="text-amber-400"
        />
      </div>

      {/* Volume chart */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-white">Settlement Volume</h2>
            <p className="text-xs text-[#4b5080] mt-0.5">SOL equivalent, last 24 hours</p>
          </div>
          <Badge variant="indigo">Live</Badge>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={MOCK_VOLUME_DATA} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="time" tick={{ fill: "#4b5080", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4b5080", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "#14141f",
                border: "1px solid #1e1e2e",
                borderRadius: 8,
                color: "#e2e4f0",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#volumeGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent settlements */}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent Settlements</h2>
          <span className="flex items-center gap-1.5 text-xs text-[#4b5080]">
            <Activity size={12} className="text-green-400 animate-pulse-glow" />
            Live
          </span>
        </div>

        <div className="space-y-1">
          {MOCK_RECENT.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#14141f] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#8b90b0]">{tx.payer}</span>
                    <span className="text-[#4b5080]">→</span>
                    <span className="font-mono text-xs text-[#8b90b0]">{tx.payee}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#4b5080]">{tx.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-sm text-white">{tx.amount}</span>
                <Badge variant={tx.status === "confirmed" ? "success" : "warning"}>
                  {tx.status}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-[#4b5080] min-w-[80px] justify-end">
                  <Clock size={10} />
                  {formatDistance(tx.time, new Date(), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
