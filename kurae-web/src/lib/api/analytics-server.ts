import { apiServerFetch } from "@/lib/api/server";
import type { SellerAnalytics } from "@/lib/types/analytics";

export async function fetchSellerAnalytics(): Promise<SellerAnalytics> {
  return apiServerFetch<SellerAnalytics>("/dashboard/analytics");
}
