import Link from "next/link";

import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { fetchPublicDrop } from "@/lib/api/drops-server";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    drop?: string;
    seller?: string;
    size?: string;
    email?: string;
  }>;
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const {
    drop: dropSlug,
    seller: sellerSlug,
    size,
    email,
  } = await searchParams;

  const drop =
    sellerSlug && dropSlug
      ? await fetchPublicDrop(sellerSlug, dropSlug)
      : null;

  const confirmedAt = new Date().toISOString();

  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4 py-12">
      <div className="w-full max-w-lg rounded-lg border border-sakura-petal bg-sakura-surface p-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-sakura-bloom">
            Order confirmed
          </p>
          <h1 className="mt-2 text-2xl font-bold text-sakura-ink">
            You&apos;re in.
          </h1>
          <p className="mt-2 text-sm text-sakura-stone">
            Payment received{email ? ` — receipt sent to ${email}` : ""}.
          </p>
        </div>

        {drop && (
          <div className="mt-6 rounded-md bg-sakura-petal/50 p-4 text-sm">
            <p className="font-medium text-sakura-ink">{drop.title}</p>
            {size && <p className="mt-1 text-sakura-mist">Size {size}</p>}
            <p className="mt-2 font-mono text-lg font-semibold text-sakura-dusk">
              {formatPrice(drop.priceCents, drop.currency)}
            </p>
          </div>
        )}

        <p className="mt-4 text-center font-mono text-xs text-sakura-mist">
          {orderId}
        </p>

        <div className="mt-8 border-t border-sakura-petal pt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
            Status
          </h2>
          <div className="mt-4">
            <OrderTimeline
              events={[
                { id: "1", label: "Order created", at: confirmedAt },
                {
                  id: "2",
                  label: "Inventory reserved",
                  at: confirmedAt,
                },
                {
                  id: "3",
                  label: "Payment confirmed",
                  at: confirmedAt,
                },
              ]}
            />
          </div>
        </div>

        {sellerSlug && dropSlug && (
          <Link
            href={`/${sellerSlug}/${dropSlug}`}
            className="mt-8 flex h-10 w-full items-center justify-center rounded-md bg-sakura-blush text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
          >
            Back to drop
          </Link>
        )}
      </div>
    </main>
  );
}
