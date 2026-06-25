import Link from "next/link";
import { redirect } from "next/navigation";

import { fetchDashboardStats } from "@/lib/api/orders";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getStorefrontPreview } from "@/lib/storefront-preview";
import { formatPrice } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  const stats = await fetchDashboardStats();
  const drops = await listSellerDrops();
  const liveDrops = drops.filter(
    (d) => d.publishStatus === "published",
  ).length;
  const storefrontPreview = getStorefrontPreview(drops);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Overview</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Welcome back, {session.sellerName}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Revenue (7d)",
            value: formatPrice(stats.revenue7dCents, "USD"),
          },
          { label: "Orders", value: String(stats.orderCount) },
          { label: "Paid", value: String(stats.paidCount) },
          { label: "Waitlist", value: String(stats.waitlistTotal) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-sakura-petal bg-sakura-surface p-4"
          >
            <p className="text-xs uppercase tracking-wide text-sakura-mist">
              {stat.label}
            </p>
            <p className="mt-2 font-mono text-2xl font-semibold text-sakura-ink">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-sakura-petal p-4">
        <h2 className="font-medium text-sakura-ink">Quick actions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/dashboard/drops/new" className="text-sakura-dusk hover:underline">
              Create a new drop
            </Link>
          </li>
          <li>
            <Link href="/dashboard/drops" className="text-sakura-dusk hover:underline">
              Manage drops ({liveDrops} published)
            </Link>
          </li>
          <li>
            <Link href="/dashboard/orders" className="text-sakura-dusk hover:underline">
              View orders
            </Link>
          </li>
          <li>
            {storefrontPreview ? (
              <Link
                href={storefrontPreview.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sakura-dusk hover:underline"
              >
                {storefrontPreview.label} — {storefrontPreview.dropTitle}
              </Link>
            ) : (
              <Link
                href="/dashboard/drops/new"
                className="text-sakura-dusk hover:underline"
              >
                Create a drop to preview your storefront
              </Link>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
