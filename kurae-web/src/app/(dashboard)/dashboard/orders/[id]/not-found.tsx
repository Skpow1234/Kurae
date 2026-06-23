import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="space-y-4 text-center">
      <h1 className="text-xl font-semibold text-sakura-ink">Order not found</h1>
      <Link href="/dashboard/orders" className="text-sm text-sakura-dusk hover:underline">
        Back to orders
      </Link>
    </div>
  );
}
