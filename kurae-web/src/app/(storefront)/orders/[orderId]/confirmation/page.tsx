import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { buildCheckoutFailedUrl, normalizeFailureReason } from "@/lib/checkout-failure";
import { requireApiBase } from "@/lib/api/config";
import type { BuyerOrderStatus } from "@/lib/types/buyer-order";
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

async function loadBuyerOrder(
  orderId: string,
  email: string,
): Promise<BuyerOrderStatus | null> {
  const qs = new URLSearchParams({ email });
  const res = await fetch(
    `${requireApiBase()}/checkout/orders/${orderId}/status?${qs.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.json() as Promise<BuyerOrderStatus>;
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const { email } = await searchParams;

  if (!email) {
    notFound();
  }

  const order = await loadBuyerOrder(orderId, email);
  if (!order) {
    notFound();
  }

  if (order.status === "payment_pending" || order.status === "reserved") {
    const params = new URLSearchParams({
      order: orderId,
      seller: order.sellerSlug,
      drop: order.dropSlug,
      size: order.sizeLabel,
      email: order.buyerEmail,
    });
    redirect(`/checkout/pending?${params.toString()}`);
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    redirect(
      buildCheckoutFailedUrl({
        reason: normalizeFailureReason(order.status),
        order: orderId,
        seller: order.sellerSlug,
        drop: order.dropSlug,
        size: order.sizeLabel,
      }),
    );
  }

  const timeline =
    order.events.length > 0
      ? order.events
      : [
          { id: "1", label: "Order created", at: order.updatedAt },
          { id: "2", label: "Payment confirmed", at: order.updatedAt },
        ];

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
            Payment received — receipt sent to {order.buyerEmail}.
          </p>
        </div>

        <div className="mt-6 rounded-md bg-sakura-petal/50 p-4 text-sm">
          <p className="font-medium text-sakura-ink">{order.dropTitle}</p>
          <p className="mt-1 text-sakura-mist">Size {order.sizeLabel}</p>
          <p className="mt-2 font-mono text-lg font-semibold text-sakura-dusk">
            {formatPrice(order.amountCents, order.currency)}
          </p>
        </div>

        <div className="mt-8 border-t border-sakura-petal pt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
            Status
          </h2>
          <div className="mt-4">
            <OrderTimeline events={timeline} compact />
          </div>
        </div>

        <Link
          href={`/${order.sellerSlug}/${order.dropSlug}`}
          className="mt-8 flex h-10 w-full items-center justify-center rounded-md bg-sakura-blush text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
        >
          Back to drop
        </Link>
      </div>
    </main>
  );
}
