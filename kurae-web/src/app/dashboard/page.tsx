import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Overview</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Utilitarian seller shell — connect to kurae-api for live data.
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
            className="rounded-lg border border-border bg-sakura-surface p-4"
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

      <div className="rounded-lg border border-border p-4">
        <h2 className="font-medium text-sakura-ink">Quick actions</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            <Link href="/dashboard/drops/new" className="text-sakura-dusk hover:underline">
              Create a new drop
            </Link>
          </li>
          <li>
            <Link
              href="/hana-studio/sakura-hoodie"
              className="text-sakura-dusk hover:underline"
            >
              Preview live drop page
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
