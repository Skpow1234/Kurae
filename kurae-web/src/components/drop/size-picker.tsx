"use client";

import { cn } from "@/lib/utils";
import type { DropSize, DropStatus } from "@/lib/types";

type SizePickerProps = {
  sizes: DropSize[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export function SizePicker({
  sizes,
  selectedId,
  onSelect,
  disabled,
}: SizePickerProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-sakura-ink">Size</p>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            disabled={disabled || !size.available}
            onClick={() => onSelect(size.id)}
            className={cn(
              "h-10 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors",
              selectedId === size.id
                ? "brand-accent-selected text-sakura-ink"
                : "border-sakura-petal bg-sakura-paper text-sakura-ink hover:bg-sakura-surface",
              !size.available && "cursor-not-allowed opacity-40 line-through",
            )}
          >
            {size.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function getPrimaryCta(status: DropStatus): {
  label: string;
  action: "buy" | "waitlist" | "disabled";
} {
  switch (status) {
    case "upcoming":
      return { label: "Join waitlist", action: "waitlist" };
    case "live":
      return { label: "Buy now", action: "buy" };
    case "sold_out":
      return { label: "Join waitlist", action: "waitlist" };
    case "expired":
      return { label: "Drop ended", action: "disabled" };
  }
}
