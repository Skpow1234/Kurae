"use client";

import { useRouter } from "next/navigation";

import { SizePicker } from "@/components/drop/size-picker";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/cart-context";
import { loginUrl } from "@/lib/auth/safe-redirect";
import type { PublicDrop } from "@/lib/types";
import { formatPrice, cn } from "@/lib/utils";

type PurchaseSectionProps = {
  id?: string;
  drop: PublicDrop;
  selectedSizeId: string | null;
  onSelectSize: (id: string) => void;
  inventoryRemaining: number;
  className?: string;
};

export function PurchaseSection({
  id = "purchase",
  drop,
  selectedSizeId,
  onSelectSize,
  inventoryRemaining,
  className,
}: PurchaseSectionProps) {
  const router = useRouter();
  const { addItem } = useCart();

  async function handleBuy() {
    if (!selectedSizeId) return;
    addItem(drop, selectedSizeId);

    const me = await fetch("/api/auth/buyer/me");
    if (me.ok) {
      router.push("/checkout");
      return;
    }

    router.push(loginUrl("/checkout"));
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
          <h2 className="text-lg font-semibold text-sakura-ink">Select size</h2>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-sakura-dusk">
            {formatPrice(drop.priceCents, drop.currency)}
          </p>
        </div>
        <p className="font-mono text-sm font-medium tabular-nums text-sakura-bloom">
          {inventoryRemaining} left
        </p>
      </div>

      <SizePicker
        sizes={drop.sizes}
        selectedId={selectedSizeId}
        onSelect={onSelectSize}
      />

      {!selectedSizeId && (
        <p className="text-sm text-sakura-mist">Choose a size to continue</p>
      )}

      <Button
        className="w-full bg-sakura-blush text-sakura-ink hover:bg-sakura-bloom sm:w-auto"
        size="lg"
        disabled={!selectedSizeId}
        onClick={handleBuy}
      >
        Buy now
      </Button>
    </section>
  );
}
