"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { buildReferralLink } from "@/lib/referral";
import type { ReferralStats } from "@/lib/types/referral";
import { cn } from "@/lib/utils";

const POLL_MS = 12_000;

type ReferralProgressProps = {
  dropId: string;
  sellerSlug: string;
  dropSlug: string;
  code: string;
};

type Step = {
  key: "clicks" | "signups" | "orders";
  label: string;
  count: number;
};

function stepComplete(step: Step["key"], stats: ReferralStats): boolean {
  switch (step) {
    case "clicks":
      return stats.clicksCount > 0;
    case "signups":
      return stats.signupsCount > 0;
    case "orders":
      return stats.ordersCount > 0;
  }
}

export function ReferralProgress({
  dropId,
  sellerSlug,
  dropSlug,
  code,
}: ReferralProgressProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const normalizedCode = code.trim();

    function fetchStats() {
      const params = new URLSearchParams({ dropId, code: normalizedCode });
      fetch(`/api/referrals/stats?${params}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: ReferralStats | null) => {
          if (!cancelled && data?.valid) {
            setStats(data);
          }
        })
        .catch(() => {
          // Ignore — progress is optional polish
        });
    }

    fetchStats();
    const timer = window.setInterval(fetchStats, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [code, dropId]);

  if (!stats) {
    return null;
  }

  const steps: Step[] = [
    { key: "clicks", label: "Clicks", count: stats.clicksCount },
    { key: "signups", label: "Signups", count: stats.signupsCount },
    { key: "orders", label: "Paid orders", count: stats.ordersCount },
  ];

  const completedSteps = steps.filter((step) => stepComplete(step.key, stats)).length;
  const progressPct = Math.round((completedSteps / steps.length) * 100);

  const link = buildReferralLink(
    window.location.origin,
    sellerSlug,
    dropSlug,
    stats.code ?? code,
  );

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg border border-sakura-petal bg-sakura-surface/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-sakura-mist">
            Referral progress
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-sakura-ink">
            {stats.code ?? code.toUpperCase()}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void copyLink()}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-sakura-petal/70">
          <div
            className="h-full rounded-full bg-sakura-dusk transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-sakura-mist">
          {completedSteps} of {steps.length} milestones reached
        </p>
      </div>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const complete = stepComplete(step.key, stats);
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step.key}
              className={cn(
                "relative rounded-md border px-3 py-3 text-center",
                complete
                  ? "border-sakura-dusk/40 bg-sakura-paper"
                  : "border-sakura-petal bg-sakura-paper/60",
              )}
            >
              {!isLast && (
                <span
                  aria-hidden
                  className="absolute right-0 top-1/2 hidden h-px w-3 translate-x-full bg-sakura-petal sm:block"
                />
              )}
              <div
                className={cn(
                  "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                  complete
                    ? "bg-sakura-dusk text-sakura-paper"
                    : "bg-sakura-petal text-sakura-mist",
                )}
              >
                {complete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <p className="mt-2 text-xs uppercase tracking-wide text-sakura-mist">
                {step.label}
              </p>
              <p className="font-mono text-lg font-semibold tabular-nums text-sakura-ink">
                {step.count}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
