"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DiscountDeleteButton } from "@/components/dashboard/discount-delete-button";
import { DiscountEditDialog } from "@/components/dashboard/discount-edit-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { buildDiscountUpdatePayload } from "@/lib/discount-status";
import type { SellerDrop } from "@/lib/types";
import type { DiscountCode } from "@/lib/types/discount";

type DiscountCodeActionsProps = {
  code: DiscountCode;
  drops: SellerDrop[];
};

export function DiscountCodeActions({ code, drops }: DiscountCodeActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);
  const [togglePending, setTogglePending] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const reactivating = !code.active;

  async function handleToggleActive() {
    setTogglePending(true);
    setToggleError(null);

    try {
      const res = await fetch(`/api/discount-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildDiscountUpdatePayload(code, { active: reactivating }),
        ),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setToggleError(data?.error ?? "Could not update code.");
        return;
      }
      setToggleOpen(false);
      router.refresh();
    } catch {
      setToggleError("Could not update code.");
    } finally {
      setTogglePending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEditOpen(true)}
      >
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setToggleError(null);
          setToggleOpen(true);
        }}
      >
        {code.active ? "Deactivate" : "Reactivate"}
      </Button>
      <DiscountDeleteButton
        id={code.id}
        code={code.code}
        usesCount={code.usesCount}
      />

      <DiscountEditDialog
        key={`${code.id}-${code.active}-${code.expiresAt ?? ""}-${code.maxUses ?? ""}-${code.value}`}
        code={code}
        drops={drops}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />

      <ConfirmDialog
        open={toggleOpen}
        title={reactivating ? "Reactivate code?" : "Deactivate code?"}
        description={
          reactivating
            ? `"${code.code}" will be accepted at checkout again if not expired or depleted.`
            : `"${code.code}" will stop working at checkout. You can reactivate it later.`
        }
        confirmLabel={reactivating ? "Reactivate" : "Deactivate"}
        destructive={!reactivating}
        pending={togglePending}
        onConfirm={() => void handleToggleActive()}
        onCancel={() => {
          if (!togglePending) {
            setToggleOpen(false);
          }
        }}
      />

      {toggleError && (
        <p className="w-full text-xs text-sakura-warning" role="alert">
          {toggleError}
        </p>
      )}
    </div>
  );
}
