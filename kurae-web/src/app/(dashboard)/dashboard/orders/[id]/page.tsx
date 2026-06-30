import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { OrderActions } from "@/components/dashboard/order-actions";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { OrderTimeline } from "@/components/dashboard/order-timeline";
import { fetchSellerOrder } from "@/lib/api/orders";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: PageProps) {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  const { id } = await params;
  const order = await fetchSellerOrder(session.sellerSlug, id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/orders"
          className="text-sm text-sakura-mist hover:text-sakura-dusk"
        >
          ← Back to orders
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-semibold text-sakura-ink">
              {order.id}
            </h1>
            <p className="mt-1 text-sm text-sakura-mist">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-sakura-mist">
            Order details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-sakura-mist">Drop</dt>
              <dd className="text-right font-medium text-sakura-ink">
                {order.dropTitle}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sakura-mist">Buyer</dt>
              <dd className="text-right text-sakura-ink">{order.buyerEmail}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-sakura-mist">Size</dt>
              <dd className="text-right font-mono">{order.sizeLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-sakura-petal pt-3">
              <dt className="font-medium text-sakura-ink">Total</dt>
              <dd className="font-mono font-semibold text-sakura-dusk">
                {formatPrice(order.amountCents, order.currency)}
              </dd>
            </div>
          </dl>
          <OrderActions
            orderId={order.id}
            status={order.status}
            amountCents={order.amountCents}
            currency={order.currency}
            buyerEmail={order.buyerEmail}
          />
        </section>

        <section className="rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-sakura-mist">
            Timeline
          </h2>
          <div className="mt-4">
            <OrderTimeline events={order.events} />
          </div>
        </section>
      </div>
    </div>
  );
}
