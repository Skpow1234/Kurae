import type { PublicDrop } from "@/lib/types";
import { isApiConfigured, apiFetch } from "@/lib/api/client";
import { getPublicDrop } from "@/lib/mock/drop-store";

export async function fetchPublicDrop(
  sellerSlug: string,
  dropSlug: string,
  options?: { allowDraft?: boolean },
): Promise<PublicDrop | null> {
  if (isApiConfigured()) {
    try {
      return await apiFetch<PublicDrop>(
        `/public/${sellerSlug}/${dropSlug}`,
      );
    } catch {
      return null;
    }
  }

  return getPublicDrop(sellerSlug, dropSlug, options);
}

export async function joinWaitlist(
  dropId: string,
  email: string,
): Promise<{ ok: boolean; rateLimited?: boolean }> {
  if (isApiConfigured()) {
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

  await new Promise((r) => setTimeout(r, 600));
  return { ok: true };
}
