"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { resolveDropStatus } from "@/lib/drop-status";
import type { DropProduct, DropSize, DropStatus, PublicDrop } from "@/lib/types";

type UseDropInventoryOptions = {
  sellerSlug: string;
  dropSlug: string;
  isPreview?: boolean;
  initialRemaining: number;
  total: number;
  status: DropStatus;
  startsAt?: string;
  endsAt?: string;
  initialSizes?: DropSize[];
  initialProducts?: DropProduct[];
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
  startsAt,
  endsAt,
  initialSizes = [],
  initialProducts = [],
  pollMs = 12_000,
}: UseDropInventoryOptions) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const [total, setTotal] = useState(initialTotal);
  const [status, setStatus] = useState(initialStatus);
  const [sizes, setSizes] = useState(initialSizes);
  const [products, setProducts] = useState(initialProducts);

  const cancelledRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(initialRemaining);
  const statusRef = useRef(initialStatus);

  useEffect(() => {
    remainingRef.current = remaining;
    statusRef.current = status;
  }, [remaining, status]);

  const poll = useCallback(async () => {
    if (cancelledRef.current) return;

    try {
      const qs = isPreview ? "?preview=1" : "";
      const res = await fetch(
        `/api/public/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(dropSlug)}${qs}`,
        { cache: "no-store" },
      );
      if (!res.ok || cancelledRef.current) return;

      const data = (await res.json()) as { drop: PublicDrop };
      setRemaining(data.drop.inventoryRemaining);
      setTotal(data.drop.inventoryTotal);
      setStatus(data.drop.status);
      if (data.drop.sizes?.length) {
        setSizes(data.drop.sizes);
      }
      if (data.drop.products?.length) {
        setProducts(data.drop.products);
      }

      if (isTerminalStatus(data.drop.status) && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch {
      // Keep last known values on transient errors.
    }
  }, [dropSlug, isPreview, sellerSlug]);

  const refresh = useCallback(() => {
    void poll();
  }, [poll]);

  const applyResolvedStatus = useCallback(() => {
    if (!startsAt || !endsAt) return;

    const currentStatus = statusRef.current;
    if (isTerminalStatus(currentStatus)) return;

    const next = resolveDropStatus(startsAt, endsAt, remainingRef.current);
    if (next !== currentStatus) {
      setStatus(next);
      void poll();
    }
  }, [endsAt, poll, startsAt]);

  useEffect(() => {
    if (isTerminalStatus(initialStatus)) return;

    cancelledRef.current = false;

    const timeoutId = setTimeout(() => {
      void poll();
      intervalRef.current = setInterval(() => void poll(), pollMs);
    }, pollMs);

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [initialStatus, poll, pollMs]);

  useEffect(() => {
    if (!startsAt || !endsAt) return;

    applyResolvedStatus();

    const now = Date.now();
    const startMs = new Date(startsAt).getTime();
    const endMs = new Date(endsAt).getTime();
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    if (status === "upcoming" && startMs > now) {
      timeouts.push(
        setTimeout(() => {
          applyResolvedStatus();
        }, startMs - now),
      );
    }

    if (status === "live" && endMs > now) {
      timeouts.push(
        setTimeout(() => {
          applyResolvedStatus();
        }, endMs - now),
      );
    }

    return () => {
      for (const id of timeouts) {
        clearTimeout(id);
      }
    };
  }, [applyResolvedStatus, endsAt, startsAt, status]);

  return {
    remaining,
    total,
    status,
    sizes,
    products,
    refresh,
    lowStock: total > 0 && remaining / total <= 0.2,
    critical: remaining > 0 && remaining <= 5,
  };
}
