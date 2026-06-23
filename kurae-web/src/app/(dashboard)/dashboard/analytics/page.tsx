const metrics = [
  { label: "Page views (7d)", value: "2,847", delta: "+12%" },
  { label: "Waitlist signups", value: "512", delta: "+8%" },
  { label: "Conversion rate", value: "3.2%", delta: "+0.4%" },
  { label: "Revenue (7d)", value: "$4,272", delta: "+18%" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Analytics</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          PostHog dashboards — mock UI (phase 2).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-lg border border-sakura-petal bg-sakura-surface p-4"
          >
            <p className="text-xs uppercase tracking-wide text-sakura-mist">
              {m.label}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-sakura-ink">
              {m.value}
            </p>
            <p className="mt-1 text-xs text-sakura-success">{m.delta}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-sakura-petal bg-sakura-surface/50 text-sm text-sakura-mist">
          Traffic chart placeholder
        </div>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-sakura-petal bg-sakura-surface/50 text-sm text-sakura-mist">
          Conversion funnel placeholder
        </div>
      </div>
    </div>
  );
}
