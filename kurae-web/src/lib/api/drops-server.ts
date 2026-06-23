import type { PublicDrop, SellerDrop } from "@/lib/types";
import { isApiConfigured } from "@/lib/api/config";
import { apiServerFetch, getAuthToken } from "@/lib/api/server";
import {
  getPublicDrop,
  listDropsBySeller,
  getDropById,
} from "@/lib/mock/drop-store";

export async function fetchPublicDrop(
  sellerSlug: string,
  dropSlug: string,
  options?: { allowDraft?: boolean },
): Promise<PublicDrop | null> {
  if (isApiConfigured()) {
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

  return getPublicDrop(sellerSlug, dropSlug, options);
}

export async function listSellerDrops(sellerSlug: string): Promise<SellerDrop[]> {
  if (isApiConfigured()) {
    const data = await apiServerFetch<{ drops: SellerDrop[] }>("/drops");
    return data.drops;
  }
  return listDropsBySeller(sellerSlug);
}

export async function getSellerDrop(id: string): Promise<SellerDrop | null> {
  if (isApiConfigured()) {
    try {
      const data = await apiServerFetch<{ drop: SellerDrop }>(`/drops/${id}`);
      return data.drop;
    } catch {
      return null;
    }
  }
  return getDropById(id);
}
