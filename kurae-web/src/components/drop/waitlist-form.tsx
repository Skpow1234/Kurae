"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/api/drops";

type WaitlistFormProps = {
  dropId: string;
  dropTitle: string;
  waitlistCount: number;
};

export function WaitlistForm({
  dropId,
  dropTitle,
  waitlistCount,
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const result = await joinWaitlist(dropId, email.trim());
    setLoading(false);

    if (result.rateLimited) {
      setError("Too many requests — try again in a minute.");
      return;
    }

    if (!result.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        id="waitlist"
        className="rounded-lg border border-sakura-petal bg-sakura-surface p-6"
      >
        <p className="text-sm font-medium text-sakura-success">
          You&apos;re on the list for {dropTitle}.
        </p>
        <p className="mt-1 text-sm text-sakura-mist">
          We&apos;ll send a reminder before launch and again when checkout opens.
        </p>
      </div>
    );
  }

  return (
    <div
      id="waitlist"
      className="rounded-lg border border-sakura-petal bg-sakura-surface p-6"
    >
      <h2 className="text-lg font-semibold text-sakura-ink">
        Get notified for this drop
      </h2>
      <p className="mt-1 text-sm text-sakura-mist">
        Join the waitlist — not a store newsletter. You&apos;ll get a heads-up
        before launch and when checkout opens.{" "}
        <span className="font-mono brand-accent-text">{waitlistCount}</span>{" "}
        people waiting.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          aria-label="Email for drop waitlist"
        />
        <Button type="submit" variant="brand" className="shrink-0" disabled={loading}>
          {loading ? "Joining…" : "Join waitlist"}
        </Button>
      </form>
      {error && (
        <p className="mt-2 text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
