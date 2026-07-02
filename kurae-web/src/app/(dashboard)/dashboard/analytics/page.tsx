import { redirect } from "next/navigation";

import { AnalyticsToolbar } from "@/components/analytics/analytics-toolbar";
import { DropBreakdownTable } from "@/components/analytics/drop-breakdown-table";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { MetricCard } from "@/components/analytics/metric-card";
import { TrafficChart } from "@/components/analytics/traffic-chart";
import { ApiLoadError } from "@/components/ui/api-load-error";
import {
  comparisonLabel,
  parseAnalyticsDays,
  periodLabel,
} from "@/lib/analytics/query";
import { fetchSellerAnalytics } from "@/lib/api/analytics-server";
import { listSellerDrops } from "@/lib/api/drops-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ days?: string; dropId?: string }>;
};

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/analytics" }));

  const params = await searchParams;
  const days = parseAnalyticsDays(params.days);
  const dropId = params.dropId?.trim() || undefined;

  let analytics;
  let drops;
  try {
    [analytics, drops] = await Promise.all([
      fetchSellerAnalytics({ days, dropId }),
      listSellerDrops(),
    ]);
  } catch {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">Analytics</h1>
        </div>
        <ApiLoadError message="Could not load analytics. Check that kurae-api is running." />
      </div>
    );
  }

  const selectedDrop = dropId ? drops.find((drop) => drop.id === dropId) : undefined;
  const compareLabel = comparisonLabel(days);
  const rangeLabel = periodLabel(days);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Analytics</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Drop traffic, waitlist growth, conversion, and revenue
          {selectedDrop ? ` for ${selectedDrop.title}` : ""} — {rangeLabel} vs the prior
          period.
        </p>
      </div>

      <AnalyticsToolbar
        days={days}
        dropId={dropId}
        drops={drops}
        showDropBreakdownExport={!dropId}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={`Page views (${rangeLabel})`}
          value={analytics.pageViews7d.toLocaleString()}
          current={analytics.pageViews7d}
          previous={analytics.pageViewsPrev7d}
          comparisonLabel={compareLabel}
        />
        <MetricCard
          label={`Waitlist signups (${rangeLabel})`}
          value={analytics.waitlistSignups7d.toLocaleString()}
          current={analytics.waitlistSignups7d}
          previous={analytics.waitlistSignupsPrev7d}
          comparisonLabel={compareLabel}
        />
        <MetricCard
          label="Conversion rate"
          value={`${analytics.conversionRate.toFixed(1)}%`}
          current={Math.round(analytics.conversionRate * 10)}
          previous={Math.round(analytics.conversionRatePrev * 10)}
          comparisonLabel={compareLabel}
        />
        <MetricCard
          label={`Revenue (${rangeLabel})`}
          value={formatPrice(analytics.revenue7dCents, "USD")}
          current={analytics.revenue7dCents}
          previous={analytics.revenuePrev7dCents}
          comparisonLabel={compareLabel}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-sakura-petal bg-sakura-surface/40 p-5">
          <h2 className="text-sm font-medium text-sakura-ink">Daily traffic</h2>
          <p className="mt-1 text-xs text-sakura-mist">Unique page loads per day</p>
          <div className="mt-4">
            <TrafficChart data={analytics.dailyTraffic} />
          </div>
        </section>
        <section className="rounded-lg border border-sakura-petal bg-sakura-surface/40 p-5">
          <h2 className="text-sm font-medium text-sakura-ink">
            Conversion funnel ({rangeLabel})
          </h2>
          <p className="mt-1 text-xs text-sakura-mist">Views → checkout → paid</p>
          <div className="mt-6">
            <FunnelChart funnel={analytics.funnel} />
          </div>
        </section>
      </div>

      {!dropId && analytics.dropBreakdown && analytics.dropBreakdown.length > 0 && (
        <section className="rounded-lg border border-sakura-petal bg-sakura-surface/40 p-5">
          <h2 className="text-sm font-medium text-sakura-ink">Per-drop breakdown</h2>
          <p className="mt-1 text-xs text-sakura-mist">
            Compare performance across drops in {rangeLabel}.
          </p>
          <div className="mt-4">
            <DropBreakdownTable
              rows={analytics.dropBreakdown}
              sellerSlug={session.sellerSlug}
              days={days}
            />
          </div>
        </section>
      )}
    </div>
  );
}
