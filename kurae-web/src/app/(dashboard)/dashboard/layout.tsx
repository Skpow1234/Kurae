import Link from "next/link";

import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getStorefrontPreview } from "@/lib/storefront-preview";

const mainNav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/drops", label: "Drops" },
  { href: "/dashboard/orders", label: "Orders" },
];

const moreNav = [
  { href: "/dashboard/analytics", label: "Analytics" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/discounts", label: "Discounts" },
  { href: "/dashboard/branding", label: "Branding" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSellerSession();
  const drops = session ? await listSellerDrops() : [];
  const storefrontPreview = getStorefrontPreview(drops);

  return (
    <div className="min-h-screen bg-sakura-paper">
      <header className="border-b border-sakura-petal bg-sakura-paper">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <span className="text-sm font-semibold text-sakura-ink">Dashboard</span>
          <nav className="hidden items-center gap-5 text-sm text-sakura-stone lg:flex">
            {mainNav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-sakura-dusk">
                {item.label}
              </Link>
            ))}
            <span className="text-sakura-petal">|</span>
            {moreNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sakura-mist hover:text-sakura-dusk"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session ? (
            <DashboardHeaderActions
              session={session}
              storefrontPreview={storefrontPreview}
            />
          ) : (
            <Link
              href={authUrl({ role: "seller", next: "/dashboard" })}
              className="text-sm text-sakura-mist hover:text-sakura-dusk"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
