import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { fetchBuyerOrder } from "@/lib/api/buyer-orders-server";
import { getBuyerSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BuyerOrderDetailPage({ params }: PageProps) {
  const session = await getBuyerSession();
  if (!session) return null;

  const { id } = await params;

  let order;
  try {
    order = await fetchBuyerOrder(id);
  } catch {
    return (
      <>
        <AccountNav active="orders" />
        <ApiLoadError message="Could not load this order. Check that kurae-api is running." />
      </>
    );
  }

  if (!order) {
    notFound();
  }

  if (order.status === "payment_pending" || order.status === "reserved") {
    const params = new URLSearchParams({
      order: order.orderId,
      seller: order.sellerSlug,
      drop: order.dropSlug,
      size: order.sizeLabel,
      email: order.buyerEmail,
    });
    redirect(`/checkout/pending?${params.toString()}`);
  }

  const hasDiscount = order.discountCents > 0;

  return (
    <>
      <div className="mb-2">
        <Link
          href="/account/orders"
          className="text-sm text-sakura-mist hover:text-sakura-dusk"
        >
          ← Back to orders
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-sakura-ink">Order details</h1>
            <p className="mt-1 font-mono text-xs text-sakura-mist">{order.orderId}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <AccountNav active="orders" />

      <div className="space-y-6">
        <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
            Item
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-sakura-mist">Drop</dt>
              <dd className="text-right font-medium text-sakura-ink">
                <Link
                  href={`/${order.sellerSlug}/${order.dropSlug}`}
                  className="hover:text-sakura-dusk hover:underline"
                >
                  {order.dropTitle}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sakura-mist">Size</dt>
              <dd className="font-mono text-sakura-ink">{order.sizeLabel}</dd>
            </div>
            {hasDiscount && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-sakura-mist">Subtotal</dt>
                  <dd className="font-mono text-sakura-ink">
                    {formatPrice(order.subtotalCents, order.currency)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sakura-mist">
                    Discount{order.discountCode ? ` (${order.discountCode})` : ""}
                  </dt>
                  <dd className="font-mono text-sakura-ink">
                    −{formatPrice(order.discountCents, order.currency)}
                  </dd>
                </div>
              </>
            )}
            <div className="flex justify-between gap-4 border-t border-sakura-petal pt-3">
              <dt className="font-medium text-sakura-ink">Total paid</dt>
              <dd className="font-mono font-semibold text-sakura-dusk">
                {formatPrice(order.amountCents, order.currency)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
            Status timeline
          </h2>
          <div className="mt-4">
            {order.events.length > 0 ? (
              <OrderTimeline events={order.events} />
            ) : (
              <p className="text-sm text-sakura-mist">
                Updated {new Date(order.updatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </section>

        <Link
          href={`/${order.sellerSlug}/${order.dropSlug}`}
          className="flex h-10 w-full items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper text-sm font-medium text-sakura-ink hover:bg-sakura-surface"
        >
          View drop
        </Link>
      </div>
    </>
  );
}
