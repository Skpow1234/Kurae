import type { AnalyticsQuery, SellerAnalytics } from "@/lib/types/analytics";
import { buildAnalyticsQuery } from "@/lib/analytics/query";
import { apiServerFetch } from "@/lib/api/server";

export async function fetchSellerAnalytics(
  params: AnalyticsQuery = {},
): Promise<SellerAnalytics> {
  const qs = buildAnalyticsQuery(params).toString();
  const path = qs ? `/dashboard/analytics?${qs}` : "/dashboard/analytics";
  return apiServerFetch<SellerAnalytics>(path);
}
