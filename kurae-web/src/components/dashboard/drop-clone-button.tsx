"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type DropCloneButtonProps = {
  dropId: string;
  dropTitle: string;
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "lg" | "icon";
};

export function DropCloneButton({
  dropId,
  dropTitle,
  className,
  variant = "outline",
  size = "sm",
}: DropCloneButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClone() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/drops/${dropId}/clone`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        drop?: { id?: string };
        error?: string;
      } | null;

      if (!res.ok || !data?.drop?.id) {
        setError(data?.error ?? "Could not clone drop.");
        return;
      }

      router.push(`/dashboard/drops/${data.drop.id}`);
      router.refresh();
    } catch {
      setError("Could not clone drop.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className={className}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => void handleClone()}
      >
        {pending ? "Cloning…" : "Clone"}
      </Button>
      {error && (
        <span className="mt-1 block text-xs text-sakura-warning" role="alert">
          {error}
        </span>
      )}
      <span className="sr-only">{dropTitle}</span>
    </span>
  );
}
