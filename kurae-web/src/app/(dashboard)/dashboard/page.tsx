import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Overview</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Welcome back, {session.sellerName}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Revenue (7d)", value: "—" },
          { label: "Orders", value: "—" },
          { label: "Waitlist", value: "—" },
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
              Manage drops
            </Link>
          </li>
          <li>
            <Link
              href={`/${session.sellerSlug}/sakura-hoodie`}
              className="text-sakura-dusk hover:underline"
            >
              Preview storefront
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
