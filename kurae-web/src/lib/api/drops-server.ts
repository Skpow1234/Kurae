import type { PublicDrop, SellerDrop } from "@/lib/types";
import { apiServerFetch, getAuthToken } from "@/lib/api/server";

export async function fetchPublicDrop(
  sellerSlug: string,
  dropSlug: string,
  options?: { allowDraft?: boolean },
): Promise<PublicDrop | null> {
  try {
    const headers: Record<string, string> = {};
    if (options?.allowDraft) {
      const token = await getAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const qs = options?.allowDraft ? "?preview=1" : "";
    return await apiServerFetch<PublicDrop>(
      `/public/${sellerSlug}/${dropSlug}${qs}`,
      { headers },
    );
  } catch {
    return null;
  }
}

export async function listSellerDrops(_sellerSlug: string): Promise<SellerDrop[]> {
  const data = await apiServerFetch<{ drops: SellerDrop[] }>("/drops");
  return data.drops;
}

export async function getSellerDrop(id: string): Promise<SellerDrop | null> {
  try {
    const data = await apiServerFetch<{ drop: SellerDrop }>(`/drops/${id}`);
    return data.drop;
  } catch {
    return null;
  }
}
