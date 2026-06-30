"use client";

import Link from "next/link";
import { useEffect } from "react";

type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
};

export function RouteError({
  error,
  reset,
  title,
  description,
  backHref = "/",
  backLabel = "Home",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-8 text-center">
      <p className="text-xs uppercase tracking-widest text-sakura-warning">
        Something went wrong
      </p>
      <h1 className="text-xl font-semibold text-sakura-ink">{title}</h1>
      <p className="mx-auto max-w-sm text-sm text-sakura-mist">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-sakura-blush px-4 py-2 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
        >
          Retry
        </button>
        <Link
          href={backHref}
          className="rounded-md border border-sakura-petal px-4 py-2 text-sm font-medium hover:bg-sakura-surface"
        >
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
