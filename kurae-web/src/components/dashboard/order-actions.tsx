"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { OrderStatus } from "@/lib/types/orders";
import { formatPrice } from "@/lib/utils";

type OrderActionsProps = {
  orderId: string;
  status: OrderStatus;
  amountCents?: number;
  currency?: string;
  buyerEmail?: string;
};

export function OrderActions({
  orderId,
  status,
  amountCents,
  currency = "USD",
  buyerEmail,
}: OrderActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"fulfill" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

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

      setRefundDialogOpen(false);
      router.refresh();
    } catch {
      setError("Could not update order.");
    } finally {
      setPending(null);
    }
  }

  const refundDescription =
    amountCents != null ? (
      <>
        This will refund{" "}
        <span className="font-mono font-medium text-sakura-ink">
          {formatPrice(amountCents, currency)}
        </span>
        {buyerEmail ? (
          <>
            {" "}
            to <span className="font-medium text-sakura-ink">{buyerEmail}</span>
          </>
        ) : null}
        . The payment will be reversed in Stripe and the order will be marked refunded.
        This cannot be undone.
      </>
    ) : (
      <>
        The payment will be reversed and the order will be marked refunded. This
        cannot be undone.
      </>
    );

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
            onClick={() => setRefundDialogOpen(true)}
            className="border-sakura-warning/40 text-sakura-warning hover:bg-sakura-warning/10"
          >
            Issue refund
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={refundDialogOpen}
        title="Issue refund?"
        description={refundDescription}
        confirmLabel="Issue refund"
        pending={pending === "refund"}
        destructive
        onConfirm={() => void runAction("refund")}
        onCancel={() => {
          if (pending !== "refund") {
            setRefundDialogOpen(false);
          }
        }}
      />

      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
