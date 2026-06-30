import { Badge } from "@/components/ui/badge";
import type { DiscountDisplayStatus } from "@/lib/discount-status";
import { cn } from "@/lib/utils";

const labels: Record<Exclude<DiscountDisplayStatus, "active">, string> = {
  inactive: "Inactive",
  expired: "Expired",
  depleted: "Max uses",
};

type DiscountStatusBadgeProps = {
  status: DiscountDisplayStatus;
  className?: string;
};

export function DiscountStatusBadge({ status, className }: DiscountStatusBadgeProps) {
  if (status === "active") {
    return null;
  }

  return (
    <Badge
      variant={status === "expired" ? "expired" : "default"}
      className={cn(
        status === "inactive" && "bg-sakura-petal text-sakura-dusk",
        status === "depleted" && "bg-sakura-warning/15 text-sakura-warning",
        className,
      )}
    >
      {labels[status]}
    </Badge>
  );
}
