import { useLocation } from "react-router-dom";
import { Bell, ExternalLink } from "lucide-react";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Overview", subtitle: "Protocol metrics and activity" },
  "/channels": { title: "Payment Channels", subtitle: "Manage open and pending channels" },
  "/payments": { title: "Payments", subtitle: "Transaction history and settlements" },
  "/explorer": { title: "Explorer", subtitle: "Look up channels, nonces, and receipts" },
  "/docs": { title: "Documentation", subtitle: "x402 protocol reference" },
};

export function Topbar() {
  const { pathname } = useLocation();
  const page = pageTitles[pathname] ?? { title: "Aeeron", subtitle: "" };

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-[#1e1e2e] bg-[#0f0f1a]">
      <div>
        <h1 className="text-sm font-semibold text-white">{page.title}</h1>
        <p className="text-xs text-[#4b5080]">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://explorer.solana.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-[#8b90b0] hover:text-white transition-colors"
        >
          <ExternalLink size={13} />
          Solana Explorer
        </a>

        <button className="w-8 h-8 rounded-md border border-[#1e1e2e] flex items-center justify-center text-[#8b90b0] hover:text-white hover:border-[#2e2e3e] transition-all">
          <Bell size={14} />
        </button>

        <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300">
          A
        </div>
      </div>
    </header>
  );
}
