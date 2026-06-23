import Link from "next/link";

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
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4">
      <div className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-sakura-bloom">
          Kurae
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-sakura-ink">
          Limited drops, done right
        </h1>
        <p className="mt-4 text-sakura-stone">
          Small batches. Timeless Japanese style.
        </p>
        <p className="mt-3 text-sm text-sakura-mist">
          Launch limited clothing drops with countdowns, waitlists, and checkout.
          Buyers reach your drops through the links you share.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/dashboard/signup" className={primaryButtonClass}>
            Create seller account
          </Link>
          <Link href="/dashboard/login" className={secondaryButtonClass}>
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
