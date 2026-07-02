"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cartLineKey } from "@/lib/cart/keys";
import { shouldUnoptimizeImageSrc } from "@/lib/images";
import type { CartLine } from "@/lib/types";
import { cn, formatPrice } from "@/lib/utils";

type CartLinesPanelProps = {
  lines: CartLine[];
  activeKey: string | null;
  onRemove: (key: string) => void;
};

export function CartLinesPanel({ lines, activeKey, onRemove }: CartLinesPanelProps) {
  return (
    <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-sakura-ink">
          Cart ({lines.length} {lines.length === 1 ? "item" : "items"})
        </h2>
        <p className="text-xs text-sakura-mist">Checkout one item at a time</p>
      </div>

      <ul className="space-y-2">
        {lines.map((line) => {
          const key = cartLineKey(line);
          const isActive = key === activeKey;

          return (
            <li
              key={key}
              className={cn(
                "flex items-center gap-3 rounded-md border p-3 transition-colors",
                isActive
                  ? "border-sakura-bloom bg-sakura-paper ring-1 ring-sakura-petal"
                  : "border-sakura-petal bg-sakura-paper/60 hover:bg-sakura-paper",
              )}
            >
              <Link
                href={`/checkout?item=${encodeURIComponent(key)}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-sakura-petal">
                  {line.heroImageUrl ? (
                    <Image
                      src={line.heroImageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="44px"
                      unoptimized={shouldUnoptimizeImageSrc(line.heroImageUrl)}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sakura-ink">
                    {line.dropTitle}
                  </p>
                  <p className="text-xs text-sakura-mist">
                    Size {line.sizeLabel} · {formatPrice(line.priceCents, line.currency)}
                  </p>
                  {isActive && (
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-sakura-dusk">
                      Checking out now
                    </p>
                  )}
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-sakura-mist hover:text-sakura-warning"
                aria-label={`Remove ${line.dropTitle} size ${line.sizeLabel} from cart`}
                onClick={() => onRemove(key)}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
