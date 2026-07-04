import Link from "next/link";

import { cn } from "@/lib/utils";

type AccountNavProps = {
  active: "settings" | "orders" | "referrals";
};

export function AccountNav({ active }: AccountNavProps) {
  const linkClass = (tab: AccountNavProps["active"]) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active === tab
        ? "bg-sakura-blush text-sakura-ink"
        : "text-sakura-mist hover:bg-sakura-surface hover:text-sakura-dusk",
    );

  return (
    <nav className="mb-8 flex gap-2 border-b border-sakura-petal pb-4">
      <Link href="/account" className={linkClass("settings")}>
        Settings
      </Link>
      <Link href="/account/orders" className={linkClass("orders")}>
        Orders
      </Link>
      <Link href="/account/referrals" className={linkClass("referrals")}>
        Referrals
      </Link>
    </nav>
  );
}
