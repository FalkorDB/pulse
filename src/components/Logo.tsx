import { Activity } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <Activity size={18} strokeWidth={2.75} />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-fg">
          FalkorDB <span className="text-accent">Pulse</span>
        </span>
      )}
    </div>
  );
}
