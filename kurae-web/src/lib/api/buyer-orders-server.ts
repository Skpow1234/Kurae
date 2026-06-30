import { ApiError } from "@/lib/api/client";
import { apiServerFetch } from "@/lib/api/server";
import { getBuyerSession } from "@/lib/auth/session";
import type { BuyerOrderListItem, BuyerOrderStatus } from "@/lib/types/buyer-order";

export type BuyerOrdersPage = {
  orders: BuyerOrderListItem[];
  total: number;
  page: number;
};

export async function fetchBuyerOrders(
  page = 1,
  pageSize = 20,
): Promise<BuyerOrdersPage | null> {
  const session = await getBuyerSession();
  if (!session) return null;

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  return apiServerFetch<BuyerOrdersPage>(`/buyer/orders?${qs.toString()}`);
}

export async function fetchBuyerOrder(
  orderId: string,
): Promise<BuyerOrderStatus | null> {
  const session = await getBuyerSession();
  if (!session) return null;

  const qs = new URLSearchParams({ email: session.email });

  try {
    return await apiServerFetch<BuyerOrderStatus>(
      `/checkout/orders/${orderId}/status?${qs.toString()}`,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export function countPendingOrders(orders: BuyerOrderListItem[]): number {
  return orders.filter(
    (o) => o.status === "payment_pending" || o.status === "reserved",
  ).length;
}
