"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Select } from "@/components/ui/select";
import {
  ANALYTICS_DAY_OPTIONS,
  buildAnalyticsExportHref,
  buildAnalyticsHref,
  parseAnalyticsDays,
  periodLabel,
  type AnalyticsDays,
} from "@/lib/analytics/query";
import type { SellerDrop } from "@/lib/types";
import { cn } from "@/lib/utils";

type AnalyticsToolbarProps = {
  days: AnalyticsDays;
  dropId?: string;
  drops: SellerDrop[];
  showDropBreakdownExport: boolean;
};

export function AnalyticsToolbar({
  days,
  dropId,
  drops,
  showDropBreakdownExport,
}: AnalyticsToolbarProps) {
  const router = useRouter();

  function updateQuery(next: { days?: AnalyticsDays; dropId?: string }) {
    router.push(
      buildAnalyticsHref({
        days: next.days ?? days,
        dropId: next.dropId !== undefined ? next.dropId : dropId,
      }),
    );
  }

  const exportParams = { days, dropId };
  const exportButtonClass = cn(
    "inline-flex h-9 items-center justify-center rounded-md border border-border",
    "bg-transparent px-3 text-sm font-medium hover:bg-sakura-surface",
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-3">
        <div>
          <label htmlFor="analytics-days" className="mb-1 block text-xs text-sakura-mist">
            Date range
          </label>
          <Select
            id="analytics-days"
            value={String(days)}
            onChange={(e) => updateQuery({ days: parseAnalyticsDays(e.target.value) })}
            className="min-w-[160px]"
          >
            {ANALYTICS_DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {periodLabel(option)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="analytics-drop" className="mb-1 block text-xs text-sakura-mist">
            Drop
          </label>
          <Select
            id="analytics-drop"
            value={dropId ?? ""}
            onChange={(e) => updateQuery({ dropId: e.target.value })}
            className="min-w-[200px]"
          >
            <option value="">All drops</option>
            {drops.map((drop) => (
              <option key={drop.id} value={drop.id}>
                {drop.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href={buildAnalyticsExportHref(exportParams, "daily")} className={exportButtonClass}>
          Export daily CSV
        </Link>
        {showDropBreakdownExport && (
          <Link href={buildAnalyticsExportHref(exportParams, "drops")} className={exportButtonClass}>
            Export drop breakdown
          </Link>
        )}
      </div>
    </div>
  );
}
