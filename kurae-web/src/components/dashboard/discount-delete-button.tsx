"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type DiscountDeleteButtonProps = {
  id: string;
  code: string;
  usesCount: number;
};

export function DiscountDeleteButton({
  id,
  code,
  usesCount,
}: DiscountDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const msg =
      usesCount > 0
        ? `"${code}" has been used and cannot be deleted.`
        : `Delete "${code}"? This cannot be undone.`;
    if (usesCount > 0) {
      window.alert(msg);
      return;
    }
    if (!window.confirm(msg)) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/discount-codes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not delete code.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not delete code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || usesCount > 0}
        onClick={() => void handleDelete()}
        className="border-sakura-warning/40 text-sakura-warning hover:bg-sakura-warning/10"
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error && (
        <p className="mt-1 text-xs text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
