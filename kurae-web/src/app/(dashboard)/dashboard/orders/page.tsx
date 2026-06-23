import Link from "next/link";

const orders = [
  {
    id: "ord_001",
    drop: "Sakura Hoodie — Drop 001",
    email: "buyer@example.com",
    status: "paid",
    amount: "$89.00",
    date: "2026-06-20",
  },
  {
    id: "ord_002",
    drop: "Sakura Hoodie — Drop 001",
    email: "fan@example.com",
    status: "payment_pending",
    amount: "$89.00",
    date: "2026-06-21",
  },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-sakura-ink">Orders</h1>
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
              <tr key={order.id} className="border-b border-sakura-petal last:border-0">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link href={`/orders/${order.id}/confirmation`} className="hover:text-sakura-dusk">
                    {order.id}
                  </Link>
                </td>
                <td className="px-4 py-3">{order.drop}</td>
                <td className="px-4 py-3 text-sakura-stone">{order.email}</td>
                <td className="px-4 py-3 capitalize text-sakura-stone">
                  {order.status.replace("_", " ")}
                </td>
                <td className="px-4 py-3 font-mono">{order.amount}</td>
                <td className="px-4 py-3 text-sakura-mist">{order.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
