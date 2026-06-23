"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OrderStatusBadge } from "@/components/dashboard/order-status-badge";
import { Select } from "@/components/ui/select";
import type { SellerOrder } from "@/lib/types/orders";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 8;

type OrdersTableProps = {
  orders: SellerOrder[];
};

export function OrdersTable({ orders }: OrdersTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (statusFilter !== "all") {
      list = list.filter((o) => o.status === statusFilter);
    }
    list.sort((a, b) => {
      const cmp = a.createdAt.localeCompare(b.createdAt);
      return sort === "newest" ? -cmp : cmp;
    });
    return list;
  }, [orders, statusFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
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
          onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
          className="w-auto min-w-[140px]"
          aria-label="Sort orders"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </Select>
      </div>

      {pageItems.length === 0 ? (
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
              {pageItems.map((order) => (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-sakura-mist">
            Page {page} of {totalPages} · {filtered.length} orders
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-sakura-petal px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-sakura-petal px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
