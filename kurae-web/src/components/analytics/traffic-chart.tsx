import type { DailyAnalyticsPoint } from "@/lib/types/analytics";

type TrafficChartProps = {
  data: DailyAnalyticsPoint[];
};

export function TrafficChart({ data }: TrafficChartProps) {
  const maxViews = Math.max(...data.map((d) => d.views), 1);

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-sakura-mist">
        No traffic yet — share your drop links to start collecting views.
      </div>
    );
  }

  return (
    <div className="h-48">
      <div className="flex h-full items-end gap-2">
        {data.map((point) => {
          const height = Math.max((point.views / maxViews) * 100, point.views > 0 ? 8 : 0);
          const label = new Date(point.date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "short",
          });
          return (
            <div key={point.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-sakura-mist">{point.views}</span>
              <div
                className="w-full rounded-t bg-sakura-blush transition-all"
                style={{ height: `${height}%`, minHeight: point.views > 0 ? "4px" : "0" }}
                title={`${point.date}: ${point.views} views`}
              />
              <span className="text-[10px] text-sakura-mist">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
