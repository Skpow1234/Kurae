"use client";

import { useEffect, useState } from "react";

import type { DropStatus } from "@/lib/types";

type UseDropInventoryOptions = {
  initialRemaining: number;
  total: number;
  status: DropStatus;
  pollMs?: number;
};

export function useDropInventory({
  initialRemaining,
  total,
  status,
  pollMs = 12_000,
}: UseDropInventoryOptions) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    setRemaining(initialRemaining);
  }, [initialRemaining]);

  useEffect(() => {
    if (status !== "live" || remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 0) return 0;
        return Math.random() > 0.6 ? prev - 1 : prev;
      });
    }, pollMs);

    return () => clearInterval(id);
  }, [status, remaining, pollMs]);

  const resolvedStatus: DropStatus =
    status === "live" && remaining <= 0 ? "sold_out" : status;

  return {
    remaining,
    total,
    status: resolvedStatus,
    lowStock: total > 0 && remaining / total <= 0.2,
    critical: remaining > 0 && remaining <= 5,
  };
}
