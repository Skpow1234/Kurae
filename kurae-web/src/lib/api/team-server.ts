import { apiServerFetch } from "@/lib/api/server";
import type { TeamMember } from "@/lib/team-permissions";

export async function listTeamMembers(): Promise<TeamMember[]> {
  try {
    const data = await apiServerFetch<{ members: TeamMember[] }>("/team/members");
    return data.members ?? [];
  } catch {
    return [];
  }
}
