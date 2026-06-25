"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type ReferralDeleteButtonProps = {
  id: string;
  code: string;
  hasActivity: boolean;
};

export function ReferralDeleteButton({
  id,
  code,
  hasActivity,
}: ReferralDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (hasActivity) {
      window.alert(`"${code}" has activity and cannot be deleted.`);
      return;
    }
    if (!window.confirm(`Delete "${code}"? This cannot be undone.`)) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/referral-codes/${id}`, { method: "DELETE" });
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
        disabled={pending || hasActivity}
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
