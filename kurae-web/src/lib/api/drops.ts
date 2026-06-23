import { apiFetch } from "@/lib/api/client";

export async function joinWaitlist(
  dropId: string,
  email: string,
): Promise<{ ok: boolean; rateLimited?: boolean }> {
  try {
    await apiFetch(`/drops/${dropId}/waitlist`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { ok: true };
  } catch (e) {
    if (e && typeof e === "object" && "status" in e && e.status === 429) {
      return { ok: false, rateLimited: true };
    }
    return { ok: false };
  }
}
