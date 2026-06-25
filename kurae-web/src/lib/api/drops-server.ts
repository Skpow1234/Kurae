import { cache } from "react";

import type { PublicDrop, SellerDrop } from "@/lib/types";
import { apiPublicFetch, apiServerFetch, getAuthToken } from "@/lib/api/server";

export const listPublicDrops = cache(async (): Promise<PublicDrop[]> => {
  try {
    const data = await apiPublicFetch<{ drops: PublicDrop[] }>("/public/drops");
    return data.drops ?? [];
  } catch {
    return [];
  }
});

export const fetchPublicDrop = cache(
  async (
    sellerSlug: string,
    dropSlug: string,
    options?: { allowDraft?: boolean },
  ): Promise<PublicDrop | null> => {
    try {
      if (options?.allowDraft) {
        const headers: Record<string, string> = {};
        const token = await getAuthToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const qs = "?preview=1";
        return await apiServerFetch<PublicDrop>(
          `/public/${sellerSlug}/${dropSlug}${qs}`,
          { headers },
        );
      }

      return await apiPublicFetch<PublicDrop>(
        `/public/${sellerSlug}/${dropSlug}`,
      );
    } catch {
      return null;
    }
  },
);

export async function listSellerDrops(): Promise<SellerDrop[]> {
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
