import { apiServerFetch } from "@/lib/api/server";
import type { SellerBranding } from "@/lib/types";

export async function getSellerBranding(): Promise<SellerBranding> {
  try {
    const data = await apiServerFetch<{ branding: SellerBranding }>("/branding");
    return data.branding;
  } catch {
    return { logoUrl: "", accent: "blush", bio: "" };
  }
}
