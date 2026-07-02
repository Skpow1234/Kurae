import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { CheckoutSavingsSummary } from "@/components/checkout/checkout-savings-summary";
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { fetchPublicSeller } from "@/lib/api/drops-server";
import { buildCheckoutFailedUrl, normalizeFailureReason } from "@/lib/checkout-failure";
import { brandCtaLinkClass } from "@/lib/branding/cta";
import { buildCheckoutPricing } from "@/lib/checkout/pricing";
import { requireApiBase } from "@/lib/api/config";
import type { BuyerOrderStatus } from "@/lib/types/buyer-order";

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

  const sellerProfile = await fetchPublicSeller(order.sellerSlug);

  const orderPricing = buildCheckoutPricing({
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    finalCents: order.amountCents,
    discountCode: order.discountCode,
    referralCode: order.referralCode,
    referralPending: false,
  });

  const timeline =
    order.events.length > 0
      ? order.events
      : [
          { id: "1", label: "Order created", at: order.updatedAt },
          { id: "2", label: "Payment confirmed", at: order.updatedAt },
        ];

  return (
    <SellerBrandTheme accent={sellerProfile?.accent}>
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
          <div className="mt-4">
            <CheckoutSavingsSummary pricing={orderPricing} />
          </div>
        </div>

        <div className="mt-8 border-t border-sakura-petal pt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
            Status
          </h2>
          <div className="mt-4">
            <OrderTimeline events={timeline} compact />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={`/account/orders/${order.orderId}`}
            className={`${brandCtaLinkClass} h-10 w-full`}
          >
            View in my orders
          </Link>
          <Link
            href={`/${order.sellerSlug}/${order.dropSlug}`}
            className="flex h-10 w-full items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper text-sm font-medium text-sakura-ink hover:bg-sakura-surface"
          >
            Back to drop
          </Link>
        </div>
      </div>
    </main>
    </SellerBrandTheme>
  );
}
