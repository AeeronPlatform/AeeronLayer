import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  icon: LucideIcon;
  iconColor?: string;
  mono?: boolean;
}

export function StatCard({
  label,
  value,
  change,
  changePositive,
  icon: Icon,
  iconColor = "text-indigo-400",
  mono,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#0f0f1a] p-5 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-[#8b90b0] uppercase tracking-wider">
          {label}
        </span>
        <div className={clsx("p-1.5 rounded-md bg-[#14141f]", iconColor)}>
          <Icon size={14} />
        </div>
      </div>

      <div className={clsx("text-2xl font-semibold text-white", mono && "font-mono")}>
        {value}
      </div>

      {change && (
        <div
          className={clsx(
            "mt-1.5 text-xs",
            changePositive ? "text-green-400" : "text-red-400"
          )}
        >
          {changePositive ? "+" : ""}{change} vs last 24h
        </div>
      )}
    </div>
  );
}
