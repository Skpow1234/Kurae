"use client";

import Link from "next/link";

import { getPrimaryCta } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import type { DropStatus } from "@/lib/types";

type StickyCtaBarProps = {
  status: DropStatus;
  inventoryRemaining: number;
  onWaitlistClick?: () => void;
};

export function StickyCtaBar({
  status,
  inventoryRemaining,
  onWaitlistClick,
}: StickyCtaBarProps) {
  const cta = getPrimaryCta(status);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-sakura-paper/95 p-4 backdrop-blur sm:hidden">
      <div className="flex items-center justify-between gap-3">
        {status === "live" && (
          <p className="font-mono text-sm font-semibold tabular-nums text-sakura-dusk">
            {inventoryRemaining} left
          </p>
        )}
        {cta.action === "buy" && (
          <Link
            href="/checkout"
            className="ml-auto inline-flex h-12 flex-1 items-center justify-center rounded-md bg-sakura-blush px-6 text-base font-medium text-sakura-ink hover:bg-sakura-bloom"
          >
            {cta.label}
          </Link>
        )}
        {cta.action === "waitlist" && (
          <Button
            className="ml-auto flex-1"
            size="lg"
            onClick={onWaitlistClick}
          >
            {cta.label}
          </Button>
        )}
        {cta.action === "disabled" && (
          <Button className="ml-auto flex-1" size="lg" disabled>
            {cta.label}
          </Button>
        )}
      </div>
    </div>
  );
}
