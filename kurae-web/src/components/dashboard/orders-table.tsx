"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { Select } from "@/components/ui/select";
import { ORDERS_PAGE_SIZE } from "@/lib/constants/orders";
import type { SellerOrder } from "@/lib/types/orders";
import { formatPrice } from "@/lib/utils";

type OrdersTableProps = {
  orders: SellerOrder[];
  total: number;
  page: number;
  statusFilter: string;
  sort: "newest" | "oldest";
};

function buildOrdersHref(
  base: URLSearchParams,
  updates: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export function OrdersTable({
  orders,
  total,
  page,
  statusFilter,
  sort,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));

  function navigate(updates: Record<string, string | undefined>) {
    router.push(buildOrdersHref(searchParams, updates));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => {
            const value = e.target.value;
            navigate({
              status: value === "all" ? undefined : value,
              page: "1",
            });
          }}
          className="w-auto min-w-[160px]"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="payment_pending">Payment pending</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="reserved">Reserved</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </Select>
        <Select
          value={sort}
          onChange={(e) => {
            const value = e.target.value as "newest" | "oldest";
            navigate({
              sort: value === "newest" ? undefined : value,
              page: "1",
            });
          }}
          className="w-auto min-w-[140px]"
          aria-label="Sort orders"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-10 text-center text-sm text-sakura-mist">
          No orders match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-sakura-petal">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Drop</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-sakura-petal last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    <Link
                      href={`/dashboard/orders/${order.id}`}
                      className="hover:text-sakura-dusk"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.dropTitle}</td>
                  <td className="px-4 py-3 text-sakura-stone">{order.buyerEmail}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {formatPrice(order.amountCents, order.currency)}
                  </td>
                  <td className="px-4 py-3 text-sakura-mist">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-sakura-mist">
            Page {page} of {totalPages} · {total} orders
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildOrdersHref(searchParams, {
                  page: String(page - 1),
                })}
                className="rounded-md border border-sakura-petal px-3 py-1 hover:bg-sakura-surface"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-md border border-sakura-petal px-3 py-1 opacity-40">
                Previous
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={buildOrdersHref(searchParams, {
                  page: String(page + 1),
                })}
                className="rounded-md border border-sakura-petal px-3 py-1 hover:bg-sakura-surface"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-md border border-sakura-petal px-3 py-1 opacity-40">
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
