import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OrdersTable } from "@/components/dashboard/orders-table";
import { fetchSellerOrders } from "@/lib/api/orders";
import { ORDERS_PAGE_SIZE } from "@/lib/constants/orders";
import { getSellerSession } from "@/lib/auth/session";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function OrdersPage({ searchParams }: PageProps) {
  const session = await getSellerSession();
  if (!session) redirect("/dashboard/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const statusFilter = params.status ?? "all";
  const sort = params.sort === "oldest" ? "oldest" : "newest";

  const { orders, total } = await fetchSellerOrders({
    page,
    pageSize: ORDERS_PAGE_SIZE,
    status: statusFilter,
    sort,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Orders</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Paginated list with filters.
        </p>
      </div>
      <Suspense>
        <OrdersTable
          orders={orders}
          total={total}
          page={page}
          statusFilter={statusFilter}
          sort={sort}
        />
      </Suspense>
    </div>
  );
}
