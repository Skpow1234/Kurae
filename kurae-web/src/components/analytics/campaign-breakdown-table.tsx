import type { CampaignAnalyticsRow } from "@/lib/types/analytics";
import { formatPrice } from "@/lib/utils";

type CampaignBreakdownTableProps = {
  rows: CampaignAnalyticsRow[];
};

export function CampaignBreakdownTable({ rows }: CampaignBreakdownTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-sakura-mist">
        No UTM-tagged traffic in this period. Share links with{" "}
        <code className="font-mono text-xs">?utm_source=&amp;utm_medium=&amp;utm_campaign=</code>{" "}
        to track campaigns.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={`${row.source}-${row.medium}-${row.campaign}`}
            className="rounded-lg border border-sakura-petal p-4"
          >
            <p className="font-medium text-sakura-ink">{row.campaign}</p>
            <p className="mt-1 text-xs text-sakura-mist">
              {row.source} · {row.medium}
            </p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Visits</dt>
                <dd className="font-mono">{row.visits}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Paid orders</dt>
                <dd className="font-mono">{row.paidOrders}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Revenue</dt>
                <dd className="font-mono">{formatPrice(row.revenueCents, "USD")}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-sakura-petal text-xs uppercase tracking-widest text-sakura-mist">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Medium</th>
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Visits</th>
              <th className="px-4 py-3 font-medium">Checkouts</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
              <th className="px-4 py-3 font-medium">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.source}-${row.medium}-${row.campaign}`} className="border-b border-sakura-petal/60">
                <td className="px-4 py-3">{row.source}</td>
                <td className="px-4 py-3">{row.medium}</td>
                <td className="px-4 py-3 font-medium text-sakura-ink">{row.campaign}</td>
                <td className="px-4 py-3 font-mono">{row.visits}</td>
                <td className="px-4 py-3 font-mono">{row.checkouts}</td>
                <td className="px-4 py-3 font-mono">{row.paidOrders}</td>
                <td className="px-4 py-3 font-mono">{formatPrice(row.revenueCents, "USD")}</td>
                <td className="px-4 py-3 font-mono">{row.conversionRate.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
