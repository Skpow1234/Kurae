"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SellerDrop } from "@/lib/types";

type ReferralFormProps = {
  drops: SellerDrop[];
  sellerSlug: string;
  suggestedCode?: string;
};

export function ReferralForm({
  drops,
  sellerSlug,
  suggestedCode,
}: ReferralFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(suggestedCode ?? "");
  const [dropId, setDropId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const payload: Record<string, string> = { code: code.trim() };
    if (dropId.trim()) {
      payload.dropId = dropId.trim();
    }

    try {
      const res = await fetch("/api/referral-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not create code.");
        return;
      }
      setCode("");
      setDropId("");
      router.refresh();
    } catch {
      setError("Could not create code.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="max-w-md space-y-3 rounded-lg border border-sakura-petal bg-sakura-surface/40 p-5"
    >
      <h2 className="text-sm font-medium text-sakura-ink">Create referral code</h2>
      <p className="text-xs text-sakura-mist">
        Share links like{" "}
        <span className="font-mono">
          /{sellerSlug}/your-drop?ref=CODE
        </span>
      </p>
      <Input
        placeholder="HANASTUDIO"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        required
        maxLength={32}
      />
      <select
        value={dropId}
        onChange={(e) => setDropId(e.target.value)}
        className="h-10 w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm"
      >
        <option value="">All drops (pick drop when copying link)</option>
        {drops.map((d) => (
          <option key={d.id} value={d.id}>
            {d.title}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="bg-sakura-dusk">
        {pending ? "Creating…" : "Create code"}
      </Button>
    </form>
  );
}
