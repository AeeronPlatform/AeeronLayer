import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "indigo";
  className?: string;
}

const variants = {
  default: "bg-[#1e1e2e] text-[#8b90b0] border-[#2e2e3e]",
  success: "bg-green-500/10 text-green-400 border-green-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
