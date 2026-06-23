"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/types/orders";

type OrderActionsProps = {
  orderId: string;
  status: OrderStatus;
};

export function OrderActions({ orderId, status }: OrderActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"fulfill" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canFulfill = status === "paid";
  const canRefund = status === "paid" || status === "fulfilled";

  if (!canFulfill && !canRefund) {
    return null;
  }

  async function runAction(action: "fulfill" | "refund") {
    setPending(action);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not update order.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not update order.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6 space-y-2">
      <div className="flex flex-wrap gap-2">
        {canFulfill && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => void runAction("fulfill")}
          >
            {pending === "fulfill" ? "Marking fulfilled…" : "Mark fulfilled"}
          </Button>
        )}
        {canRefund && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => void runAction("refund")}
          >
            {pending === "refund" ? "Issuing refund…" : "Issue refund"}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
