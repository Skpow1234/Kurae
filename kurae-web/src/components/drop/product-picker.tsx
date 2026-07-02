"use client";

import Image from "next/image";

import { shouldUnoptimizeImageSrc } from "@/lib/images";
import type { DropProduct } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type ProductPickerProps = {
  products: DropProduct[];
  currency: string;
  selectedId: string | null;
  onSelect: (productId: string) => void;
};

export function ProductPicker({
  products,
  currency,
  selectedId,
  onSelect,
}: ProductPickerProps) {
  if (products.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-sakura-ink">Choose item</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => {
          const selected = product.id === selectedId;
          const soldOut = product.inventoryRemaining <= 0;

          return (
            <button
              key={product.id}
              type="button"
              disabled={soldOut}
              onClick={() => onSelect(product.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                selected
                  ? "border-brand-accent bg-sakura-paper ring-1 ring-brand-accent/40"
                  : "border-sakura-petal bg-sakura-paper/60 hover:bg-sakura-paper",
                soldOut && "cursor-not-allowed opacity-60",
              )}
            >
              <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded bg-sakura-surface">
                {product.imageUrl ? (
                  <Image
                    src={product.imageUrl}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized={shouldUnoptimizeImageSrc(product.imageUrl)}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sakura-ink">{product.name}</p>
                <p className="mt-0.5 font-mono text-sm font-semibold tabular-nums brand-accent-text">
                  {formatPrice(product.priceCents, currency)}
                </p>
                <p className="mt-1 text-xs text-sakura-mist">
                  {soldOut
                    ? "Sold out"
                    : `${product.inventoryRemaining} left`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
