import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getBuyerSession } from "@/lib/auth/session";
import type { BuyerOrderListItem } from "@/lib/types/buyer-order";

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
  const token = await readToken();
  if (!session || !token) return null;

  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const res = await fetch(`${requireApiBase()}/buyer/orders?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    orders?: BuyerOrderListItem[];
    total?: number;
    page?: number;
  };
  return {
    orders: data.orders ?? [],
    total: data.total ?? 0,
    page: data.page ?? page,
  };
}

export function countPendingOrders(orders: BuyerOrderListItem[]): number {
  return orders.filter(
    (o) => o.status === "payment_pending" || o.status === "reserved",
  ).length;
}
