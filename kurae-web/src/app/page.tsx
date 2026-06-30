import Link from "next/link";
import { Suspense } from "react";

import { BuyerHomeWelcome } from "@/components/home/buyer-home-welcome";
import { PublicDropsSection } from "@/components/home/public-drops-section";
import { PublicDropsSkeleton } from "@/components/home/public-drops-skeleton";
import { ApiLoadError } from "@/components/ui/api-load-error";
import {
  countPendingOrders,
  fetchBuyerOrders,
} from "@/lib/api/buyer-orders-server";
import { listSellerDrops } from "@/lib/api/drops-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getBuyerSession, getSellerSession } from "@/lib/auth/session";
import { getStorefrontPreview } from "@/lib/storefront-preview";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-sakura-blush px-4 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper px-4 text-sm font-medium hover:bg-sakura-surface";
const textLinkClass =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-sakura-dusk hover:bg-sakura-surface";

function GuestHome() {
  return (
    <>
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
          <Link
            href={authUrl({
              mode: "signup",
              role: "seller",
              next: "/dashboard/drops/new",
            })}
            className={`mt-6 ${primaryButtonClass}`}
          >
            Get started as a seller
          </Link>
        </div>
      </section>
    </>
  );
}

function BuyerBrowseSection() {
  return (
    <section id="drops" className="mx-auto max-w-6xl px-4 py-12 pb-20">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-sakura-ink">Live drops</h2>
        <p className="mt-1 text-sm text-sakura-mist">
          Pick a drop, choose your size, and check out with your account.
        </p>
      </div>
      <Suspense fallback={<PublicDropsSkeleton />}>
        <PublicDropsSection />
      </Suspense>
    </section>
  );
}

export default async function HomePage() {
  const sellerSession = await getSellerSession();

  if (sellerSession) {
    let drops;
    try {
      drops = await listSellerDrops();
    } catch {
      return (
        <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4">
          <div className="max-w-lg w-full">
            <h1 className="text-center text-2xl font-semibold text-sakura-ink">
              Welcome back, {sellerSession.sellerName}
            </h1>
            <ApiLoadError
              className="mt-6"
              message="Could not load your drops. Check that kurae-api is running."
            />
            <div className="mt-6 text-center">
              <Link href="/dashboard" className={primaryButtonClass}>
                Open dashboard
              </Link>
            </div>
          </div>
        </main>
      );
    }

    const preview = getStorefrontPreview(drops);
    const publishedCount = drops.filter(
      (d) => d.publishStatus === "published",
    ).length;

    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4">
        <div className="max-w-lg text-center">
          <h1 className="text-4xl font-bold tracking-tight text-sakura-ink">
            Welcome back, {sellerSession.sellerName}
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

  const buyerSession = await getBuyerSession();

  if (buyerSession) {
    let ordersPage;
    let ordersLoadFailed = false;
    try {
      ordersPage = await fetchBuyerOrders(1, 20);
    } catch {
      ordersLoadFailed = true;
      ordersPage = null;
    }
    const orders = ordersPage?.orders ?? [];
    const orderTotal = ordersPage?.total ?? 0;

    return (
      <main className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-sakura-petal/40 to-sakura-paper">
        {ordersLoadFailed && (
          <div className="mx-auto max-w-6xl px-4 pt-6">
            <ApiLoadError message="Could not load your orders. Live drops below may still be available." />
          </div>
        )}
        <BuyerHomeWelcome
          name={buyerSession.name || buyerSession.email}
          email={buyerSession.email}
          orderTotal={orderTotal}
          pendingCount={countPendingOrders(orders)}
          recentOrders={orders}
        />
        <BuyerBrowseSection />
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-sakura-petal/40 to-sakura-paper">
      <GuestHome />
    </main>
  );
}
