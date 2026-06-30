import type { SellerOrder } from "@/lib/types/orders";
import { ApiError } from "@/lib/api/client";
import { apiServerFetch } from "@/lib/api/server";

export type DashboardStats = {
  revenue7dCents: number;
  orderCount: number;
  paidCount: number;
  waitlistTotal: number;
};

export type SellerOrdersListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  sort?: "newest" | "oldest";
};

export type SellerOrdersListResult = {
  orders: SellerOrder[];
  total: number;
  page: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiServerFetch<DashboardStats>("/dashboard/stats");
}

export async function fetchSellerOrders(
  params: SellerOrdersListParams = {},
): Promise<SellerOrdersListResult> {
  const qs = new URLSearchParams();
  if (params.page && params.page > 0) {
    qs.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize > 0) {
    qs.set("pageSize", String(params.pageSize));
  }
  if (params.status && params.status !== "all") {
    qs.set("status", params.status);
  }
  if (params.sort === "oldest") {
    qs.set("sort", "oldest");
  }

  const query = qs.toString();
  return apiServerFetch<SellerOrdersListResult>(
    `/orders${query ? `?${query}` : ""}`,
  );
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
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
