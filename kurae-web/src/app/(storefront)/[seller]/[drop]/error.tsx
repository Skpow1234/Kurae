"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { brandCtaClass } from "@/lib/branding/cta";
import { useSellerAccent } from "@/lib/branding/use-seller-accent";
import { cn } from "@/lib/utils";

export default function DropError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const sellerSlug = typeof params?.seller === "string" ? params.seller : undefined;
  const dropSlug = typeof params?.drop === "string" ? params.drop : undefined;
  const accent = useSellerAccent(sellerSlug, dropSlug);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SellerBrandTheme accent={accent}>
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
            className={cn("rounded-md px-4 py-2 text-sm font-medium", brandCtaClass)}
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
    </SellerBrandTheme>
  );
}
