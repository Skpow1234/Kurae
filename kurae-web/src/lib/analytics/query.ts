import type { AnalyticsQuery } from "@/lib/types/analytics";

export const ANALYTICS_DAY_OPTIONS = [7, 30, 90] as const;

export type AnalyticsDays = (typeof ANALYTICS_DAY_OPTIONS)[number];

export function parseAnalyticsDays(raw?: string | number): AnalyticsDays {
  const value = typeof raw === "number" ? raw : parseInt(raw ?? "7", 10);
  if (value === 30 || value === 90) {
    return value;
  }
  return 7;
}

export function buildAnalyticsQuery(params: AnalyticsQuery): URLSearchParams {
  const qs = new URLSearchParams();
  const days = parseAnalyticsDays(params.days);
  qs.set("days", String(days));
  if (params.dropId?.trim()) {
    qs.set("dropId", params.dropId.trim());
  }
  return qs;
}

export function buildAnalyticsHref(params: AnalyticsQuery): string {
  const qs = buildAnalyticsQuery(params).toString();
  return qs ? `/dashboard/analytics?${qs}` : "/dashboard/analytics";
}

export function buildAnalyticsExportHref(
  params: AnalyticsQuery,
  format: "daily" | "drops",
): string {
  const qs = buildAnalyticsQuery(params);
  qs.set("format", format);
  return `/api/dashboard/analytics/export?${qs.toString()}`;
}

export function periodLabel(days: AnalyticsDays): string {
  return `last ${days} days`;
}

export function comparisonLabel(days: AnalyticsDays): string {
  return `vs prior ${days} days`;
}
