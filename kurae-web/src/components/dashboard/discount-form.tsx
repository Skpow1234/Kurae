"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SellerDrop } from "@/lib/types";

type DiscountFormProps = {
  drops: SellerDrop[];
};

export function DiscountForm({ drops }: DiscountFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [dropId, setDropId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const numValue = type === "percent" ? parseInt(value, 10) : Math.round(parseFloat(value) * 100);
    if (!Number.isFinite(numValue) || numValue < 1) {
      setError(type === "percent" ? "Enter a valid percentage." : "Enter a valid dollar amount.");
      setPending(false);
      return;
    }

    const payload: Record<string, unknown> = {
      code: code.trim(),
      type,
      value: numValue,
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
      const res = await fetch("/api/discount-codes", {
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
      setValue("");
      setMaxUses("");
      setExpiresAt("");
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
      <h2 className="text-sm font-medium text-sakura-ink">Create code</h2>
      <Input
        placeholder="CODE"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        required
        maxLength={32}
      />
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "percent" | "fixed")}
          className="h-10 flex-1 rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm"
        >
          <option value="percent">Percent off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
        <Input
          placeholder={type === "percent" ? "10" : "5.00"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="flex-1"
        />
      </div>
      <Input
        type="number"
        min={1}
        placeholder="Max uses (optional)"
        value={maxUses}
        onChange={(e) => setMaxUses(e.target.value)}
      />
      <Input
        type="date"
        placeholder="Expires (optional)"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
      />
      <select
        value={dropId}
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
