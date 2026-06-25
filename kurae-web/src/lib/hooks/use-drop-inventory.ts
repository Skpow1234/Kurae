"use client";

import { useEffect, useState } from "react";

import type { DropStatus, PublicDrop } from "@/lib/types";

type UseDropInventoryOptions = {
  sellerSlug: string;
  dropSlug: string;
  isPreview?: boolean;
  initialRemaining: number;
  total: number;
  status: DropStatus;
  pollMs?: number;
};

function isTerminalStatus(status: DropStatus): boolean {
  return status === "sold_out" || status === "expired";
}

export function useDropInventory({
  sellerSlug,
  dropSlug,
  isPreview = false,
  initialRemaining,
  total: initialTotal,
  status: initialStatus,
  pollMs = 12_000,
}: UseDropInventoryOptions) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [total, setTotal] = useState(initialTotal);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setRemaining(initialRemaining);
    setTotal(initialTotal);
    setStatus(initialStatus);
  }, [
    dropSlug,
    initialRemaining,
    initialStatus,
    initialTotal,
    sellerSlug,
  ]);

  useEffect(() => {
    if (isTerminalStatus(initialStatus)) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      if (cancelled) return;

      try {
        const qs = isPreview ? "?preview=1" : "";
        const res = await fetch(
          `/api/public/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(dropSlug)}${qs}`,
          { cache: "no-store" },
        );
        if (!res.ok || cancelled) return;

        const data = (await res.json()) as { drop: PublicDrop };
        setRemaining(data.drop.inventoryRemaining);
        setTotal(data.drop.inventoryTotal);
        setStatus(data.drop.status);

        if (isTerminalStatus(data.drop.status) && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        // Keep last known values on transient errors.
      }
    }

    // Server already rendered inventory; defer polling to avoid a duplicate fetch on load.
    const timeoutId = setTimeout(() => {
      void poll();
      intervalId = setInterval(() => void poll(), pollMs);
    }, pollMs);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [dropSlug, initialStatus, isPreview, pollMs, sellerSlug]);

  return {
    remaining,
    total,
    status,
    lowStock: total > 0 && remaining / total <= 0.2,
    critical: remaining > 0 && remaining <= 5,
  };
}
