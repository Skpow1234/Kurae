import { redirect } from "next/navigation";

import { OrdersTable } from "@/components/dashboard/orders-table";
import { getSession } from "@/lib/auth/session";
import { listOrdersBySeller } from "@/lib/mock/order-store";

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  const orders = listOrdersBySeller(session.sellerSlug);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Orders</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Paginated list with filters — mock data until kurae-api ships.
        </p>
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
