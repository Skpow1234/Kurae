import Link from "next/link";
import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/dashboard/settings-form";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { canManageTeam } from "@/lib/team-permissions";

export default async function SettingsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Settings</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Update your account and brand details.
        </p>
        {canManageTeam(session.teamRole) && (
          <Link
            href="/dashboard/settings/team"
            className="mt-3 inline-block text-sm font-medium text-sakura-dusk hover:underline"
          >
            Manage team members →
          </Link>
        )}
      </div>
      <SettingsForm session={session} />
    </div>
  );
}
