"use client";

import { useEffect, useRef } from "react";

type ReferralCaptureProps = {
  dropId: string;
  sellerSlug: string;
  refCode?: string;
};

export function ReferralCapture({
  dropId,
  sellerSlug,
  refCode,
}: ReferralCaptureProps) {
  const tracked = useRef(false);

  useEffect(() => {
    const code = refCode?.trim();
    if (!code || tracked.current) return;
    tracked.current = true;

    void fetch("/api/referrals/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dropId, code, sellerSlug }),
    }).catch(() => {
      tracked.current = false;
    });
  }, [dropId, sellerSlug, refCode]);

  return null;
}
