import { redirect } from "next/navigation";

import { FunnelChart } from "@/components/analytics/funnel-chart";
import { MetricCard } from "@/components/analytics/metric-card";
import { TrafficChart } from "@/components/analytics/traffic-chart";
import { fetchSellerAnalytics } from "@/lib/api/analytics-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

export default async function AnalyticsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/analytics" }));

  const analytics = await fetchSellerAnalytics();

  if (!analytics) {
    return (
      <div className="rounded-lg border border-sakura-petal p-8 text-center text-sm text-sakura-stone">
        Could not load analytics. Check that kurae-api is running.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Analytics</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Drop traffic, waitlist growth, conversion, and revenue — last 7 days vs the prior week.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Page views (7d)"
          value={analytics.pageViews7d.toLocaleString()}
          current={analytics.pageViews7d}
          previous={analytics.pageViewsPrev7d}
        />
        <MetricCard
          label="Waitlist signups (7d)"
          value={analytics.waitlistSignups7d.toLocaleString()}
          current={analytics.waitlistSignups7d}
          previous={analytics.waitlistSignupsPrev7d}
        />
        <MetricCard
          label="Conversion rate"
          value={`${analytics.conversionRate.toFixed(1)}%`}
          current={Math.round(analytics.conversionRate * 10)}
          previous={Math.round(analytics.conversionRatePrev * 10)}
        />
        <MetricCard
          label="Revenue (7d)"
          value={formatPrice(analytics.revenue7dCents, "USD")}
          current={analytics.revenue7dCents}
          previous={analytics.revenuePrev7dCents}
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
          <h2 className="text-sm font-medium text-sakura-ink">Conversion funnel (7d)</h2>
          <p className="mt-1 text-xs text-sakura-mist">Views → checkout → paid</p>
          <div className="mt-6">
            <FunnelChart funnel={analytics.funnel} />
          </div>
        </section>
      </div>
    </div>
  );
}
