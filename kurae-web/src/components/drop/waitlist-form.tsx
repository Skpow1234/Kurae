"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WaitlistFormProps = {
  dropTitle: string;
  waitlistCount: number;
};

export function WaitlistForm({ dropTitle, waitlistCount }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        id="waitlist"
        className="rounded-lg border border-border bg-sakura-surface p-6"
      >
        <p className="text-sm font-medium text-sakura-success">
          You&apos;re on the list for {dropTitle}.
        </p>
        <p className="mt-1 text-sm text-sakura-mist">
          We&apos;ll email you when this drop goes live.
        </p>
      </div>
    );
  }

  return (
    <div
      id="waitlist"
      className="rounded-lg border border-border bg-sakura-surface p-6"
    >
      <h2 className="text-lg font-semibold text-sakura-ink">
        Get notified for this drop
      </h2>
      <p className="mt-1 text-sm text-sakura-mist">
        Join the waitlist — not a store newsletter.{" "}
        <span className="font-mono text-sakura-stone">{waitlistCount}</span>{" "}
        people waiting.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email for drop waitlist"
        />
        <Button type="submit" className="shrink-0">
          Join waitlist
        </Button>
      </form>
    </div>
  );
}
