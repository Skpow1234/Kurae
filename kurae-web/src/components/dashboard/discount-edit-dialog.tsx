"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { discountExpiresAtToInput } from "@/lib/discount-status";
import type { SellerDrop } from "@/lib/types";
import type { DiscountCode } from "@/lib/types/discount";
import { cn } from "@/lib/utils";

type DiscountEditDialogProps = {
  code: DiscountCode;
  drops: SellerDrop[];
  open: boolean;
  onClose: () => void;
};

export function DiscountEditDialog({
  code,
  drops,
  open,
  onClose,
}: DiscountEditDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountLocked = code.usesCount > 0;

  const [type, setType] = useState(code.type);
  const [value, setValue] = useState(
    code.type === "percent" ? String(code.value) : (code.value / 100).toFixed(2),
  );
  const [maxUses, setMaxUses] = useState(code.maxUses != null ? String(code.maxUses) : "");
  const [expiresAt, setExpiresAt] = useState(discountExpiresAtToInput(code.expiresAt));
  const [dropId, setDropId] = useState(code.dropId ?? "");
  const [active, setActive] = useState(code.active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const numValue =
      type === "percent" ? parseInt(value, 10) : Math.round(parseFloat(value) * 100);
    if (!Number.isFinite(numValue) || numValue < 1) {
      setError(type === "percent" ? "Enter a valid percentage." : "Enter a valid dollar amount.");
      setPending(false);
      return;
    }

    const payload: Record<string, unknown> = {
      type,
      value: numValue,
      active,
    };
    if (maxUses.trim()) {
      payload.maxUses = parseInt(maxUses, 10);
    }
    if (expiresAt.trim()) {
      payload.expiresAt = expiresAt.trim();
    }
    if (dropId.trim()) {
      payload.dropId = dropId.trim();
    }

    try {
      const res = await fetch(`/api/discount-codes/${code.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not update code.");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Could not update code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
        "rounded-lg border border-sakura-petal bg-sakura-paper p-0 shadow-lg",
        "backdrop:bg-sakura-ink/40 backdrop:backdrop-blur-sm",
      )}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) {
          onClose();
        }
      }}
      onClose={() => {
        if (!pending) {
          onClose();
        }
      }}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="p-6">
        <h2 className="text-lg font-semibold text-sakura-ink">Edit {code.code}</h2>
        <p className="mt-1 text-sm text-sakura-mist">
          Code text cannot be changed. Amount is locked after first use.
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={type}
              disabled={amountLocked || pending}
              onChange={(e) => setType(e.target.value as "percent" | "fixed")}
              className="h-10 flex-1 rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm disabled:opacity-60"
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
            <Input
              placeholder={type === "percent" ? "10" : "5.00"}
              value={value}
              disabled={amountLocked || pending}
              onChange={(e) => setValue(e.target.value)}
              required
              className="flex-1 disabled:opacity-60"
            />
          </div>
          <Input
            type="number"
            min={code.usesCount > 0 ? code.usesCount : 1}
            placeholder="Max uses (optional)"
            value={maxUses}
            disabled={pending}
            onChange={(e) => setMaxUses(e.target.value)}
          />
          <Input
            type="date"
            value={expiresAt}
            disabled={pending}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <select
            value={dropId}
            disabled={pending}
            onChange={(e) => setDropId(e.target.value)}
            className="h-10 w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm"
          >
            <option value="">All drops</option>
            {drops.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-sakura-ink">
            <input
              type="checkbox"
              checked={active}
              disabled={pending}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-sakura-petal"
            />
            Active at checkout
          </label>
        </div>

        {error && (
          <p className="mt-3 text-sm text-sakura-warning" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="bg-sakura-dusk">
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
