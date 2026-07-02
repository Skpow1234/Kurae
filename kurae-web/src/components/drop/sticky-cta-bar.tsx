"use client";

import Link from "next/link";

import { getPrimaryCta } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import { brandCtaLinkLgClass } from "@/lib/branding/cta";
import type { DropStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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
          <Link href={checkoutHref} className={cn(brandCtaLinkLgClass, "ml-auto flex-1")}>
            {cta.label}
          </Link>
        )}
        {cta.action === "buy" && !checkoutHref && (
          <Button variant="brand" className="ml-auto flex-1" size="lg" onClick={onBuyWithoutSize}>
            {cta.label}
          </Button>
        )}
        {cta.action === "waitlist" && (
          <Button variant="brand" className="ml-auto flex-1" size="lg" onClick={onWaitlistClick}>
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
