"use client";

import { cn } from "@/lib/utils";

type InventoryBarProps = {
  remaining: number;
  total: number;
  className?: string;
};

export function InventoryBar({ remaining, total, className }: InventoryBarProps) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const lowStock = pct <= 20;
  const critical = remaining <= 5 && remaining > 0;

  let fillClass = "bg-sakura-blush";
  if (lowStock) fillClass = "bg-sakura-dusk";
  if (critical) fillClass = "bg-sakura-warning animate-pulse-warning";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-sakura-mist">
          Inventory
        </p>
        <p className="font-mono text-sm font-semibold tabular-nums text-sakura-paper">
          {remaining} left
        </p>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-sakura-stone/40">
        <div
          className={cn("h-full rounded-full transition-all duration-500", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-sakura-mist">
        {remaining} / {total} units
      </p>
    </div>
  );
}
