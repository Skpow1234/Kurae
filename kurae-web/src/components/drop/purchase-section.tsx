"use client";

import Link from "next/link";

import { SizePicker } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import type { DropSize } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type PurchaseSectionProps = {
  id?: string;
  sizes: DropSize[];
  selectedSizeId: string | null;
  onSelectSize: (id: string) => void;
  priceCents: number;
  currency: string;
  inventoryRemaining: number;
  sellerSlug: string;
  dropSlug: string;
  className?: string;
};

export function PurchaseSection({
  id = "purchase",
  sizes,
  selectedSizeId,
  onSelectSize,
  priceCents,
  currency,
  inventoryRemaining,
  sellerSlug,
  dropSlug,
  className,
}: PurchaseSectionProps) {
  const checkoutHref = selectedSizeId
    ? `/checkout?seller=${sellerSlug}&drop=${dropSlug}&size=${selectedSizeId}`
    : undefined;

  return (
    <section
      id={id}
      className={cn(
        "space-y-5 rounded-lg border border-sakura-petal bg-sakura-surface/80 p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-sakura-ink">Select size</h2>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-sakura-dusk">
            {formatPrice(priceCents, currency)}
          </p>
        </div>
        <p className="font-mono text-sm font-medium tabular-nums text-sakura-bloom">
          {inventoryRemaining} left
        </p>
      </div>

      <SizePicker
        sizes={sizes}
        selectedId={selectedSizeId}
        onSelect={onSelectSize}
      />

      {!selectedSizeId && (
        <p className="text-sm text-sakura-mist">Choose a size to continue</p>
      )}

      {checkoutHref ? (
        <Link
          href={checkoutHref}
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-sakura-blush text-base font-medium text-sakura-ink transition-colors hover:bg-sakura-bloom sm:w-auto sm:px-8"
        >
          Buy now
        </Link>
      ) : (
        <Button className="w-full sm:w-auto" size="lg" disabled>
          Buy now
        </Button>
      )}
    </section>
  );
}
