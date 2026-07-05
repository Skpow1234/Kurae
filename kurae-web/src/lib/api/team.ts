import type { TeamMember } from "@/lib/team-permissions";

export async function createTeamMember(input: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "staff";
}): Promise<{ ok: boolean; member?: TeamMember; error?: string }> {
  const res = await fetch("/api/team/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { member?: TeamMember; error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not add team member" };
  }
  return { ok: true, member: data.member };
}

export async function updateTeamMember(
  id: string,
  input: { name: string; role: "admin" | "staff" },
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/team/members/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not update team member" };
  }
  return { ok: true };
}

export async function deleteTeamMember(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/team/members/${id}`, { method: "DELETE" });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Could not remove team member" };
  }
  return { ok: true };
}
