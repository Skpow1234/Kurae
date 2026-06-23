import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-sm text-sakura-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sakura-bloom",
        className,
      )}
      {...props}
    />
  );
}
