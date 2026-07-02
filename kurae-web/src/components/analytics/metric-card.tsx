import { deltaTone, formatDelta } from "@/lib/analytics/format";

type MetricCardProps = {
  label: string;
  value: string;
  current: number;
  previous: number;
  comparisonLabel: string;
};

export function MetricCard({
  label,
  value,
  current,
  previous,
  comparisonLabel,
}: MetricCardProps) {
  const tone = deltaTone(current, previous);
  const delta = formatDelta(current, previous);
  const deltaClass =
    tone === "up"
      ? "text-sakura-success"
      : tone === "down"
        ? "text-sakura-warning"
        : "text-sakura-mist";

  return (
    <div className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
      <p className="text-xs uppercase tracking-wide text-sakura-mist">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold text-sakura-ink">{value}</p>
      <p className={`mt-1 text-xs ${deltaClass}`}>{comparisonLabel} · {delta}</p>
    </div>
  );
}
