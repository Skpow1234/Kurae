"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DropError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sakura-paper px-4 text-center">
      <p className="text-xs uppercase tracking-widest text-sakura-warning">
        Something went wrong
      </p>
      <h1 className="mt-2 text-2xl font-bold text-sakura-ink">
        Couldn&apos;t load this drop
      </h1>
      <p className="mt-2 max-w-sm text-sm text-sakura-mist">
        Try again in a moment. If the problem persists, the drop may have been
        removed.
      </p>
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-sakura-blush px-4 py-2 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
        >
          Retry
        </button>
        <Link
          href="/"
          className="rounded-md border border-sakura-petal px-4 py-2 text-sm font-medium hover:bg-sakura-surface"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
