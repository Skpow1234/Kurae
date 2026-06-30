"use client";

import { RouteError } from "@/components/ui/route-error";

export default function AccountError({
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
      title="Could not load account"
      description="Try again in a moment. If the problem persists, check that kurae-api is running."
      backHref="/account"
      backLabel="Account home"
    />
  );
}
