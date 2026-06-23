import { Skeleton } from "@/components/ui/skeleton";

export function DropPageSkeleton() {
  return (
    <div className="min-h-screen bg-sakura-paper">
      <Skeleton className="h-9 w-full rounded-none" />
      <Skeleton className="h-14 w-full rounded-none" />
      <Skeleton className="h-[70vh] w-full rounded-none" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="aspect-[3/4] w-full" />
            <Skeleton className="aspect-[3/4] w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
