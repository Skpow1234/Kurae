"use client";

import { X } from "lucide-react";
import { useState } from "react";

type PromoStripProps = {
  message: string;
};

export function PromoStrip({ message }: PromoStripProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-sakura-ink px-4 py-2 text-center text-xs tracking-wide text-sakura-paper sm:text-sm">
      <p>{message}</p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-sakura-stone/50"
        aria-label="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
