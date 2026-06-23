import { redirect } from "next/navigation";

import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/drops", label: "Drops" },
  { href: "/dashboard/orders", label: "Orders" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-sakura-paper">
      <header className="border-b border-sakura-petal bg-sakura-paper">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="text-sm font-semibold text-sakura-ink">
            Kurae Dashboard
          </Link>
          <nav className="hidden gap-6 text-sm text-sakura-stone sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hover:text-sakura-dusk"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {session ? (
            <DashboardHeaderActions session={session} />
          ) : (
            <Link
              href="/dashboard/login"
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
