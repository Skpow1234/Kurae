"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type DropDeleteButtonProps = {
  dropId: string;
  dropTitle: string;
  /** After delete from the edit page, navigate to the drops list. */
  redirectToList?: boolean;
  className?: string;
};

export function DropDeleteButton({
  dropId,
  dropTitle,
  redirectToList = false,
  className,
}: DropDeleteButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${dropTitle}"? This cannot be undone. Drops with orders cannot be deleted.`,
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/drops/${dropId}`, { method: "DELETE" });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not delete drop.");
        return;
      }

      if (redirectToList) {
        router.push("/dashboard/drops");
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not delete drop.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => void handleDelete()}
        className="border-sakura-warning/40 text-sakura-warning hover:bg-sakura-warning/10"
      >
        {pending ? "Deleting…" : "Delete drop"}
      </Button>
      {error && (
        <p className="mt-2 text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
