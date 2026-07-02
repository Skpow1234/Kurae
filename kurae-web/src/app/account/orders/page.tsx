import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";
import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { buyerOrderHref } from "@/lib/buyer-order-link";
import { fetchBuyerOrders } from "@/lib/api/buyer-orders-server";
import { getBuyerSession } from "@/lib/auth/session";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BuyerOrdersPage({ searchParams }: PageProps) {
  const session = await getBuyerSession();
  if (!session) return null;

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let ordersPage;
  try {
    ordersPage = await fetchBuyerOrders(page, 20);
  } catch {
    return (
      <>
        <div className="mb-2">
          <h1 className="text-2xl font-semibold text-sakura-ink">Your orders</h1>
        </div>
        <AccountNav active="orders" />
        <ApiLoadError message="Could not load your orders. Check that kurae-api is running." />
      </>
    );
  }

  if (!ordersPage) {
    return null;
  }

  const orders = ordersPage.orders;
  const total = ordersPage.total;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-sakura-ink">Your orders</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          {total > 0
            ? `${total} order${total === 1 ? "" : "s"} on your account.`
            : "Orders you place while signed in appear here."}
        </p>
      </div>
      <AccountNav active="orders" />

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-10 text-center">
          <p className="text-sakura-stone">No orders yet.</p>
          <Link
            href="/#drops"
            className="mt-4 inline-block text-sm text-sakura-dusk hover:underline"
          >
            Browse drops
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.orderId}>
              <Link
                href={buyerOrderHref(order)}
                className="block rounded-lg border border-sakura-petal bg-sakura-surface p-4 transition-colors hover:border-sakura-blush hover:bg-sakura-paper"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sakura-ink">{order.dropTitle}</p>
                    <p className="mt-0.5 text-sm text-sakura-mist">
                      {order.productName && order.productName !== order.dropTitle
                        ? `${order.productName} · Size ${order.sizeLabel}`
                        : `Size ${order.sizeLabel}`}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-mono font-semibold text-sakura-dusk">
                    {formatPrice(order.amountCents, order.currency)}
                  </span>
                  <span className="text-sakura-mist">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={`/account/orders?page=${page - 1}`}
              className="text-sakura-dusk hover:underline"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sakura-mist">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/account/orders?page=${page + 1}`}
              className="text-sakura-dusk hover:underline"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
