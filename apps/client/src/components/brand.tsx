import { cn } from "@/lib/utils";

export function BlockMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 50 50" className={cn("size-9", className)} aria-hidden="true"><path d="M2 2h10v10H2zM14 2h10v10H14zM26 2h10v10H26zM38 2h10v10H38zM26 14h10v10H26zM14 26h10v10H14zM2 38h10v10H2zM14 38h10v10H14zM26 38h10v10H26zM38 38h10v10H38z" fill="currentColor" /></svg>;
}

export function Brand({ className }: { className?: string }) {
  return <div className={cn("flex items-center gap-3 text-foreground", className)}><BlockMark /><span className="font-mono text-2xl font-semibold tracking-[-0.08em]">zeta</span></div>;
}
