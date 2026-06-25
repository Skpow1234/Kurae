import type { AnalyticsFunnel } from "@/lib/types/analytics";

type FunnelChartProps = {
  funnel: AnalyticsFunnel;
};

export function FunnelChart({ funnel }: FunnelChartProps) {
  const steps = [
    { label: "Page views", value: funnel.views },
    { label: "Checkouts started", value: funnel.checkouts },
    { label: "Paid orders", value: funnel.paid },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-4">
      {steps.map((step) => {
        const width = Math.max((step.value / max) * 100, step.value > 0 ? 12 : 0);
        return (
          <div key={step.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-sakura-stone">{step.label}</span>
              <span className="font-mono tabular-nums text-sakura-ink">{step.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-sakura-petal">
              <div
                className="h-full rounded-full bg-sakura-dusk"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
      {funnel.views === 0 && (
        <p className="text-xs text-sakura-mist">
          Funnel populates once buyers visit and check out your drops.
        </p>
      )}
    </div>
  );
}
