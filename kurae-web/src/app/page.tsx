import Link from "next/link";
import { Suspense } from "react";

import { PublicDropsSection } from "@/components/home/public-drops-section";
import { PublicDropsSkeleton } from "@/components/home/public-drops-skeleton";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSession } from "@/lib/auth/session";
import { getStorefrontPreview } from "@/lib/storefront-preview";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-sakura-blush px-4 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper px-4 text-sm font-medium hover:bg-sakura-surface";
const textLinkClass =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-sakura-dusk hover:bg-sakura-surface";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    const drops = await listSellerDrops(session.sellerSlug);
    const preview = getStorefrontPreview(drops);
    const publishedCount = drops.filter(
      (d) => d.publishStatus === "published",
    ).length;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4">
        <div className="max-w-lg text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-sakura-bloom">
            Kurae
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-sakura-ink">
            Welcome back, {session.sellerName}
          </h1>
          <p className="mt-4 text-sakura-stone">
            {publishedCount > 0
              ? `You have ${publishedCount} published drop${publishedCount === 1 ? "" : "s"}.`
              : "Launch your first drop when you're ready."}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link href="/dashboard" className={primaryButtonClass}>
              Open dashboard
            </Link>
            {preview ? (
              <Link
                href={preview.href}
                target="_blank"
                rel="noopener noreferrer"
                className={secondaryButtonClass}
              >
                {preview.label} — {preview.dropTitle}
              </Link>
            ) : (
              <Link href="/dashboard/drops/new" className={secondaryButtonClass}>
                Create your first drop
              </Link>
            )}
            <Link href="/dashboard/drops" className={textLinkClass}>
              Manage drops
            </Link>
            <Link href="/#drops" className={textLinkClass}>
              Browse all drops
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sakura-petal/40 to-sakura-paper">
      <header className="border-b border-sakura-petal/60 bg-sakura-paper/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-sakura-bloom">
            Kurae
          </span>
          <div className="flex items-center gap-2">
            <Link href="/login" className={textLinkClass}>
              Sign in
            </Link>
            <Link href="/dashboard/signup" className={primaryButtonClass}>
              Sell on Kurae
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-sakura-ink sm:text-5xl">
          Limited drops, done right
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-sakura-stone">
          Small batches. Timeless Japanese style.
        </p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-sakura-mist">
          Discover independent brands launching scarce clothing drops — no account
          needed to browse.
        </p>
        <a href="#drops" className={`mt-8 ${primaryButtonClass}`}>
          Browse drops
        </a>
      </section>

      <section id="drops" className="mx-auto max-w-6xl px-4 pb-20">
        <Suspense fallback={<PublicDropsSkeleton />}>
          <PublicDropsSection />
        </Suspense>
      </section>

      <section className="border-t border-sakura-petal bg-sakura-surface/50 py-12">
        <div className="mx-auto max-w-lg px-4 text-center">
          <h2 className="text-lg font-semibold text-sakura-ink">
            Launch your own drop
          </h2>
          <p className="mt-2 text-sm text-sakura-mist">
            Countdowns, waitlists, limited inventory, and checkout — built for
            hype releases.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/dashboard/signup" className={primaryButtonClass}>
              Create seller account
            </Link>
            <Link href="/dashboard/login" className={secondaryButtonClass}>
              Seller sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
