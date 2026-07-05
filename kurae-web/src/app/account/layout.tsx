import { redirect } from "next/navigation";

import { AccountAnalyticsShell } from "@/components/analytics/account-analytics-shell";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getBuyerSession } from "@/lib/auth/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getBuyerSession();
  if (!session) {
    redirect(authUrl({ role: "buyer", next: "/account" }));
  }

  return (
    <AccountAnalyticsShell email={session.email}>
      <main className="mx-auto max-w-lg px-4 py-10">{children}</main>
    </AccountAnalyticsShell>
  );
}
