import { apiServerFetch } from "@/lib/api/server";
import type { SellerAnalytics } from "@/lib/types/analytics";

export async function fetchSellerAnalytics(): Promise<SellerAnalytics | null> {
  try {
    return await apiServerFetch<SellerAnalytics>("/dashboard/analytics");
  } catch {
    return null;
  }
}
