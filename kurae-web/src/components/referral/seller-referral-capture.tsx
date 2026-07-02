"use client";

import { useEffect, useRef } from "react";

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
