import type { OrderEvent } from "@/lib/types/orders";

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-4 pl-2">
          {i < events.length - 1 && (
            <span
              className="absolute left-[7px] top-3 h-full w-px bg-sakura-petal"
              aria-hidden
            />
          )}
          <span className="relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sakura-blush ring-2 ring-sakura-paper" />
          <div className="pb-2">
            <p className="text-sm font-medium text-sakura-ink">{event.label}</p>
            {event.detail && (
              <p className="text-xs text-sakura-mist">{event.detail}</p>
            )}
            <p className="mt-0.5 font-mono text-xs text-sakura-mist">
              {new Date(event.at).toLocaleString()}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
