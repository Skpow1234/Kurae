import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-sakura-surface text-sakura-ink",
        live: "bg-sakura-blush text-sakura-ink",
        upcoming: "bg-sakura-surface text-sakura-stone",
        soldOut: "bg-sakura-dusk text-sakura-paper",
        expired: "bg-sakura-mist text-sakura-paper",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
