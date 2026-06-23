import type { SellerOrder } from "@/lib/types/orders";
import { apiServerFetch } from "@/lib/api/server";

export type DashboardStats = {
  revenue7dCents: number;
  orderCount: number;
  paidCount: number;
  waitlistTotal: number;
};

export async function fetchDashboardStats(
  _sellerSlug: string,
): Promise<DashboardStats> {
  return apiServerFetch<DashboardStats>("/dashboard/stats");
}

export async function fetchSellerOrders(
  _sellerSlug: string,
): Promise<SellerOrder[]> {
  const data = await apiServerFetch<{ orders: SellerOrder[] }>("/orders");
  return data.orders;
}

export async function fetchSellerOrder(
  _sellerSlug: string,
  orderId: string,
): Promise<SellerOrder | null> {
  try {
    const data = await apiServerFetch<{ order: SellerOrder }>(
      `/orders/${orderId}`,
    );
    return data.order;
  } catch {
    return null;
  }
}
