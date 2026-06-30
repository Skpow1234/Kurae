import { Skeleton } from "@/components/ui/skeleton";

type PageLoadingProps = {
  rows?: number;
};

export function PageLoading({ rows = 3 }: PageLoadingProps) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-24 w-full" />
      ))}
    </div>
  );
}
