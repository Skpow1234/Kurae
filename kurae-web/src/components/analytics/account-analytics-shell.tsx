"use client";

import { BuyerIdentitySync } from "@/components/analytics/buyer-identity-sync";

type AccountAnalyticsShellProps = {
  email: string;
  children: React.ReactNode;
};

export function AccountAnalyticsShell({
  email,
  children,
}: AccountAnalyticsShellProps) {
  return (
    <>
      <BuyerIdentitySync email={email} role="buyer" />
      {children}
    </>
  );
}
