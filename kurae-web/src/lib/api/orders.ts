import type { SellerOrder } from "@/lib/types/orders";
import { isApiConfigured } from "@/lib/api/config";
import { apiServerFetch } from "@/lib/api/server";
import {
  getDashboardStats,
  getOrderById,
  listOrdersBySeller,
} from "@/lib/mock/order-store";

export type DashboardStats = {
  revenue7dCents: number;
  orderCount: number;
  paidCount: number;
  waitlistTotal: number;
};

export async function fetchDashboardStats(
  sellerSlug: string,
): Promise<DashboardStats> {
  if (isApiConfigured()) {
    return apiServerFetch<DashboardStats>("/dashboard/stats");
  }
  return getDashboardStats(sellerSlug);
}

export async function fetchSellerOrders(
  sellerSlug: string,
): Promise<SellerOrder[]> {
  if (isApiConfigured()) {
    const data = await apiServerFetch<{ orders: SellerOrder[] }>("/orders");
    return data.orders;
  }
  return listOrdersBySeller(sellerSlug);
}

export async function fetchSellerOrder(
  sellerSlug: string,
  orderId: string,
): Promise<SellerOrder | null> {
  if (isApiConfigured()) {
    try {
      const data = await apiServerFetch<{ order: SellerOrder }>(
        `/orders/${orderId}`,
      );
      return data.order;
    } catch {
      return null;
    }
  }
  const order = getOrderById(orderId);
  if (!order || order.sellerSlug !== sellerSlug) return null;
  return order;
}
