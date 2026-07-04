import type { OrderStatus } from "@/lib/types/orders";
import { cn } from "@/lib/utils";

const styles: Record<OrderStatus, string> = {
  reserved: "bg-sakura-petal text-sakura-dusk",
  payment_pending: "bg-sakura-surface text-sakura-stone ring-1 ring-sakura-petal",
  paid: "bg-sakura-blush/60 text-sakura-ink",
  shipped: "bg-sakura-success/15 text-sakura-success",
  fulfilled: "bg-sakura-success/15 text-sakura-success",
  cancelled: "bg-sakura-mist/20 text-sakura-mist",
  refunded: "bg-sakura-warning/15 text-sakura-warning",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-sm px-2 py-0.5 text-xs font-medium capitalize",
        styles[status],
        className,
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
