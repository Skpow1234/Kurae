"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { OrderStatus } from "@/lib/types/orders";
import type { TeamRole } from "@/lib/team-permissions";
import { canRefundOrders, canShipOrders } from "@/lib/team-permissions";
import { formatPrice } from "@/lib/utils";

type OrderActionsProps = {
  orderId: string;
  status: OrderStatus;
  amountCents?: number;
  currency?: string;
  buyerEmail?: string;
  teamRole: TeamRole;
};

export function OrderActions({
  orderId,
  status,
  amountCents,
  currency = "USD",
  buyerEmail,
  teamRole,
}: OrderActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<"ship" | "refund" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [shipDialogOpen, setShipDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  const canShip = canShipOrders(teamRole) && status === "paid";
  const canRefund =
    canRefundOrders(teamRole) &&
    (status === "paid" || status === "shipped" || status === "fulfilled");

  if (!canShip && !canRefund) {
    return null;
  }

  async function runAction(action: "ship" | "refund", tracking?: string) {
    setPending(action);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          trackingNumber: tracking?.trim(),
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not update order.");
        return;
      }

      setRefundDialogOpen(false);
      setShipDialogOpen(false);
      setTrackingNumber("");
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
        {canShip && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => setShipDialogOpen(true)}
          >
            Mark shipped
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
        open={shipDialogOpen}
        title="Mark order shipped?"
        description={
          <>
            <p>
              Enter the carrier tracking number. The buyer will see it on their order
              page.
            </p>
            <div className="mt-4">
              <label htmlFor="tracking-number" className="mb-1 block text-sm font-medium">
                Tracking number
              </label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="1Z999AA10123456784"
                disabled={pending === "ship"}
              />
            </div>
          </>
        }
        confirmLabel="Mark shipped"
        pending={pending === "ship"}
        onConfirm={() => {
          if (!trackingNumber.trim()) {
            setError("Tracking number is required.");
            return;
          }
          void runAction("ship", trackingNumber);
        }}
        onCancel={() => {
          if (pending !== "ship") {
            setShipDialogOpen(false);
            setError(null);
          }
        }}
      />

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
