import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  ArrowLeftRight,
  GitBranch,
  Search,
  BookOpen,
  Zap,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/channels", label: "Channels", icon: GitBranch },
  { to: "/payments", label: "Payments", icon: ArrowLeftRight },
  { to: "/explorer", label: "Explorer", icon: Search },
  { to: "/docs", label: "Docs", icon: BookOpen },
];

export function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-[#1e1e2e] bg-[#0f0f1a]">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1e1e2e]">
        <div className="w-7 h-7 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
            <path d="M8 1L15 14H1L8 1Z" stroke="#6366f1" strokeWidth="1.2" strokeLinejoin="round" />
            <line x1="5.5" y1="11" x2="10.5" y2="11" stroke="#6366f1" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <span className="text-sm font-semibold text-white tracking-wide">Aeeron</span>
          <div className="text-[10px] text-indigo-400/70 font-mono leading-none mt-0.5">x402 Protocol</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        {navItems.map(({ to, label, icon: Icon, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all",
                isActive
                  ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20"
                  : "text-[#8b90b0] hover:bg-[#1e1e2e] hover:text-white"
              )
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Network indicator */}
      <div className="px-4 py-4 border-t border-[#1e1e2e]">
        <div className="flex items-center gap-2 text-xs text-[#4b5080]">
          <Zap size={11} className="text-green-500" />
          <span className="font-mono">mainnet-beta</span>
        </div>
      </div>
    </aside>
  );
}
