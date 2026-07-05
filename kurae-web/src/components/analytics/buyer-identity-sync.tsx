"use client";

import { useEffect } from "react";

import { identifyUser, resetAnalyticsIdentity } from "@/lib/analytics/track";

type BuyerIdentitySyncProps = {
  email?: string;
  role?: "buyer" | "seller";
};

export function BuyerIdentitySync({ email, role }: BuyerIdentitySyncProps) {
  useEffect(() => {
    const normalized = email?.trim();
    if (!normalized) {
      resetAnalyticsIdentity();
      return;
    }
    identifyUser(normalized, { role: role ?? "buyer" });
  }, [email, role]);

  return null;
}
