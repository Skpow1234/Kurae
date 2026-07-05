"use client";

import { useEffect, useRef } from "react";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

type SellerReferralCaptureProps = {
  sellerSlug: string;
  refCode?: string;
};

export function SellerReferralCapture({
  sellerSlug,
  refCode,
}: SellerReferralCaptureProps) {
  const tracked = useRef(false);

  useEffect(() => {
    const code = refCode?.trim();
    if (!code || tracked.current) return;
    tracked.current = true;

    trackEvent(AnalyticsEvents.referralLinkClicked, {
      seller_slug: sellerSlug,
      referral_code: code,
    });

    fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerSlug, code }),
    }).catch(() => {
      tracked.current = false;
    });
  }, [sellerSlug, refCode]);

  return null;
}
