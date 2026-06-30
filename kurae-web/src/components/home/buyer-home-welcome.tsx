import Link from "next/link";

import { buyerOrderHref } from "@/lib/buyer-order-link";
import type { BuyerOrderListItem } from "@/lib/types/buyer-order";

const primaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md bg-sakura-blush px-4 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom";
const secondaryButtonClass =
  "inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper px-4 text-sm font-medium hover:bg-sakura-surface";
const textLinkClass =
  "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-sakura-dusk hover:bg-sakura-surface";

type BuyerHomeWelcomeProps = {
  name: string;
  orderTotal: number;
  pendingCount: number;
  recentOrders: BuyerOrderListItem[];
};

export function BuyerHomeWelcome({
  name,
  orderTotal,
  pendingCount,
  recentOrders,
}: BuyerHomeWelcomeProps) {
  return (
    <section className="border-b border-sakura-petal/60 bg-sakura-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-sakura-bloom">
            Welcome back
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-sakura-ink sm:text-4xl">
            {name}
          </h1>
          <p className="mt-3 text-sakura-stone">
            {orderTotal > 0
              ? `You have ${orderTotal} order${orderTotal === 1 ? "" : "s"} on Kurae.`
              : "Browse live drops and check out when something catches your eye."}
          </p>
        </div>

        {pendingCount > 0 && (
          <p className="mt-4 rounded-md border border-sakura-blush/60 bg-sakura-blush/20 px-4 py-3 text-sm text-sakura-ink">
            {pendingCount} order{pendingCount === 1 ? " is" : "s are"} awaiting
            payment — open{" "}
            <Link href="/account/orders" className="font-medium underline">
              My orders
            </Link>{" "}
            to finish checkout.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#drops" className={primaryButtonClass}>
            Browse drops
          </a>
          <Link href="/account/orders" className={secondaryButtonClass}>
            My orders
            {orderTotal > 0 ? ` (${orderTotal})` : ""}
          </Link>
          <Link href="/checkout" className={secondaryButtonClass}>
            Checkout
          </Link>
          <Link href="/account" className={textLinkClass}>
            Account settings
          </Link>
        </div>

        {recentOrders.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium uppercase tracking-wide text-sakura-mist">
              Recent orders
            </h2>
            <ul className="mt-3 space-y-2">
              {recentOrders.slice(0, 3).map((order) => (
                <li key={order.orderId}>
                  <Link
                    href={buyerOrderHref(order)}
                    className="flex items-center justify-between gap-4 rounded-md border border-sakura-petal bg-sakura-paper px-4 py-3 text-sm transition-colors hover:border-sakura-blush"
                  >
                    <span className="truncate font-medium text-sakura-ink">
                      {order.dropTitle}
                    </span>
                    <span className="shrink-0 capitalize text-sakura-mist">
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {orderTotal > 3 && (
              <Link
                href="/account/orders"
                className="mt-3 inline-block text-sm text-sakura-dusk hover:underline"
              >
                View all orders
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
