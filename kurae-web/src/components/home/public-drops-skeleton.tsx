import { Skeleton } from "@/components/ui/skeleton";

export function PublicDropsSkeleton() {
  return (
    <>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-sakura-petal bg-sakura-paper"
          >
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
