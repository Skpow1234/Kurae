import Link from "next/link";

import { AccountNav } from "@/components/account/account-nav";

export default function BuyerOrderNotFound() {
  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-sakura-ink">Order not found</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          This order doesn&apos;t exist or isn&apos;t on your account.
        </p>
      </div>
      <AccountNav active="orders" />
      <Link
        href="/account/orders"
        className="inline-block text-sm text-sakura-dusk hover:underline"
      >
        ← Back to orders
      </Link>
    </>
  );
}
