"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { fetchBuyerReferralProgress } from "@/lib/api/buyer-referrals";
import { authUrl } from "@/lib/auth/safe-redirect";
import { buildReferralLink } from "@/lib/referral";
import type { BuyerReferralProgress } from "@/lib/types/referral-reward";
import { formatPrice } from "@/lib/utils";

type BuyerReferralRewardsProps = {
  sellerSlug: string;
  dropSlug: string;
  returnPath: string;
};

function rewardLabel(progress: BuyerReferralProgress): string {
  if (progress.rewardType === "percent") {
    return `${progress.rewardValue}% off`;
  }
  return formatPrice(progress.rewardValue, "USD");
}

export function BuyerReferralRewards({
  sellerSlug,
  dropSlug,
  returnPath,
}: BuyerReferralRewardsProps) {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<BuyerReferralProgress | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/buyer/me")
      .then((res) => {
        if (!res.ok) {
          if (!cancelled) setLoggedIn(false);
          return null;
        }
        return fetchBuyerReferralProgress(sellerSlug);
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setLoggedIn(true);
          setProgress(data);
        }
      })
      .catch(() => {
        if (!cancelled) setLoggedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sellerSlug]);

  if (loggedIn === null) {
    return null;
  }

  if (!loggedIn) {
    return (
      <section className="rounded-lg border border-sakura-petal bg-sakura-surface/50 p-4 text-sm">
        <p className="font-medium text-sakura-ink">Earn rewards for sharing</p>
        <p className="mt-1 text-sakura-mist">
          Sign in to get your personal referral link and earn discounts when friends
          purchase.
        </p>
        <Link
          href={authUrl({ role: "buyer", next: returnPath })}
          className="brand-accent-link mt-3 inline-block text-sm font-medium hover:underline"
        >
          Sign in to share
        </Link>
      </section>
    );
  }

  if (!progress || !progress.rewardsEnabled) {
    return null;
  }

  return (
    <BuyerReferralRewardsPanel
      progress={progress}
      sellerSlug={sellerSlug}
      dropSlug={dropSlug}
    />
  );
}

function BuyerReferralRewardsPanel({
  progress,
  sellerSlug,
  dropSlug,
}: {
  progress: BuyerReferralProgress;
  sellerSlug: string;
  dropSlug: string;
}) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? buildReferralLink(window.location.origin, sellerSlug, dropSlug, progress.code)
      : "";

  const progressPct =
    progress.threshold > 0
      ? Math.round((progress.progressInTier / progress.threshold) * 100)
      : 0;

  const unusedReward = progress.earnedRewards.find((reward) => !reward.redeemed);

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-lg border border-sakura-petal bg-sakura-surface/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-sakura-mist">
            Share & earn
          </p>
          <p className="mt-1 text-sm text-sakura-stone">
            {progress.referralsUntilReward} more paid referral
            {progress.referralsUntilReward === 1 ? "" : "s"} until{" "}
            <span className="font-medium text-sakura-ink">{rewardLabel(progress)}</span>
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
        <div className="flex justify-between text-xs text-sakura-mist">
          <span>
            {progress.successfulReferrals} successful referral
            {progress.successfulReferrals === 1 ? "" : "s"}
          </span>
          <span className="font-mono">{progress.progressInTier}/{progress.threshold}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-sakura-petal/70">
          <div
            className="brand-accent-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {unusedReward && (
        <div className="mt-4 rounded-md border border-[color-mix(in_srgb,var(--brand-primary)_30%,transparent)] bg-sakura-paper p-3 text-sm">
          <p className="font-medium text-sakura-ink">Reward ready</p>
          <p className="mt-1 text-sakura-mist">
            Use code{" "}
            <span className="font-mono font-semibold text-sakura-ink">
              {unusedReward.code}
            </span>{" "}
            at checkout for {rewardLabel(progress)}.
          </p>
        </div>
      )}

      <p className="mt-3 font-mono text-xs text-sakura-mist">Your code: {progress.code}</p>
    </section>
  );
}
