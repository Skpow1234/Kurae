"use client";

import { RouteError } from "@/components/ui/route-error";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="Could not load dashboard"
      description="Try again in a moment. If the problem persists, check that kurae-api is running."
      backHref="/dashboard"
      backLabel="Dashboard home"
    />
  );
}
