import Link from "next/link";
import { redirect } from "next/navigation";

import { TeamMembersPanel } from "@/components/dashboard/team-members-panel";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listTeamMembers } from "@/lib/api/team-server";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { requireTeamRole } from "@/lib/require-team-role";

export default async function TeamSettingsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/settings/team" }));
  requireTeamRole(session.teamRole, ["owner"]);

  let members;
  try {
    members = await listTeamMembers();
  } catch {
    return (
      <div className="max-w-3xl space-y-8">
        <div>
          <Link
            href="/dashboard/settings"
            className="text-sm text-sakura-mist hover:text-sakura-dusk"
          >
            ← Settings
          </Link>
          <h1 className="mt-4 text-2xl font-semibold text-sakura-ink">Team</h1>
        </div>
        <ApiLoadError message="Could not load team members. Check that kurae-api is running." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <Link
          href="/dashboard/settings"
          className="text-sm text-sakura-mist hover:text-sakura-dusk"
        >
          ← Settings
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-sakura-ink">Team</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Invite admins and staff to help run drops and fulfill orders.
        </p>
      </div>
      <TeamMembersPanel initialMembers={members} />
    </div>
  );
}
