"use client";

import Link from "next/link";

import { getPrimaryCta } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import type { DropStatus } from "@/lib/types";

type StickyCtaBarProps = {
  status: DropStatus;
  inventoryRemaining: number;
  checkoutHref?: string;
  onWaitlistClick?: () => void;
  onBuyWithoutSize?: () => void;
};

export function StickyCtaBar({
  status,
  inventoryRemaining,
  checkoutHref,
  onWaitlistClick,
  onBuyWithoutSize,
}: StickyCtaBarProps) {
  const cta = getPrimaryCta(status);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-sakura-petal bg-sakura-paper/95 p-4 backdrop-blur sm:hidden">
      <div className="flex items-center justify-between gap-3">
        {status === "live" && (
          <p className="brand-accent-text font-mono text-sm font-semibold tabular-nums">
            {inventoryRemaining} left
          </p>
        )}
        {cta.action === "buy" && checkoutHref && (
          <Link
            href={checkoutHref}
            className="brand-accent-bg ml-auto inline-flex h-12 flex-1 items-center justify-center rounded-md px-6 text-base font-medium text-sakura-ink"
          >
            {cta.label}
          </Link>
        )}
        {cta.action === "buy" && !checkoutHref && (
          <Button
            className="brand-accent-bg ml-auto flex-1 text-sakura-ink"
            size="lg"
            onClick={onBuyWithoutSize}
          >
            {cta.label}
          </Button>
        )}
        {cta.action === "waitlist" && (
          <Button
            className="brand-accent-bg ml-auto flex-1 text-sakura-ink"
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
