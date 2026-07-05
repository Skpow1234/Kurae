import { redirect } from "next/navigation";

import type { TeamRole } from "@/lib/team-permissions";

export function requireTeamRole(
  role: TeamRole,
  allowed: TeamRole[],
  fallback = "/dashboard",
): void {
  if (!allowed.includes(role)) {
    redirect(fallback);
  }
}
