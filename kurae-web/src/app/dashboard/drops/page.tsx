import Link from "next/link";

const drops = [
  {
    title: "Sakura Hoodie — Drop 001",
    slug: "sakura-hoodie",
    status: "Live",
    inventory: "47 / 120",
  },
  {
    title: "Sakura Tee — Drop 002",
    slug: "sakura-tee",
    status: "Upcoming",
    inventory: "200 / 200",
  },
];

export default function DropsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sakura-ink">Drops</h1>
        <Link
          href="/dashboard/drops/new"
          className="rounded-md bg-sakura-ink px-4 py-2 text-sm font-medium text-sakura-paper hover:bg-sakura-stone"
        >
          New drop
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Inventory</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {drops.map((drop) => (
              <tr key={drop.slug} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-sakura-ink">
                  {drop.title}
                </td>
                <td className="px-4 py-3 text-sakura-stone">{drop.status}</td>
                <td className="px-4 py-3 font-mono text-sakura-stone">
                  {drop.inventory}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/hana-studio/${drop.slug}`}
                    className="text-sakura-dusk hover:underline"
                  >
                    Preview
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
