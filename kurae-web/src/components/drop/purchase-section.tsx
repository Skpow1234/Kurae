"use client";

import { useRouter } from "next/navigation";

import { SizePicker } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { productRequiresSize } from "@/lib/drop-products";
import type { DropProduct, PublicDrop } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type PurchaseSectionProps = {
  id?: string;
  drop: PublicDrop;
  product: DropProduct;
  selectedSizeId: string | null;
  onSelectSize: (id: string) => void;
  className?: string;
};

export function PurchaseSection({
  id = "purchase",
  drop,
  product,
  selectedSizeId,
  onSelectSize,
  className,
}: PurchaseSectionProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const requiresSize = productRequiresSize(product);
  const canBuy =
    product.inventoryRemaining > 0 &&
    (!requiresSize || Boolean(selectedSizeId));

  async function handleBuy() {
    if (!canBuy) return;
    const key = addItem(drop, product.id, selectedSizeId ?? "");
    if (!key) return;

    router.push(`/checkout?item=${encodeURIComponent(key)}`);
  }

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
          <h2 className="text-lg font-semibold text-sakura-ink">
            {requiresSize ? "Select size" : "Ready to buy"}
          </h2>
          {drop.products && drop.products.length > 1 && (
            <p className="mt-1 text-sm text-sakura-stone">{product.name}</p>
          )}
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums brand-accent-text">
            {formatPrice(product.priceCents, drop.currency)}
          </p>
        </div>
        <p className="font-mono text-sm font-medium tabular-nums brand-accent-text">
          {product.inventoryRemaining} left
        </p>
      </div>

      {requiresSize && (
        <SizePicker
          sizes={product.sizes}
          selectedId={selectedSizeId}
          onSelect={onSelectSize}
        />
      )}

      {requiresSize && !selectedSizeId && (
        <p className="text-sm text-sakura-mist">Choose a size to continue</p>
      )}

      <Button
        variant="brand"
        className="w-full sm:w-auto"
        size="lg"
        disabled={!canBuy}
        onClick={handleBuy}
      >
        Buy now
      </Button>
    </section>
  );
}
