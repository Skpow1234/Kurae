import Link from "next/link";

import { buildAnalyticsHref } from "@/lib/analytics/query";
import type { DropAnalyticsRow } from "@/lib/types/analytics";
import { formatPrice } from "@/lib/utils";

type DropBreakdownTableProps = {
  rows: DropAnalyticsRow[];
  sellerSlug: string;
  days: number;
};

export function DropBreakdownTable({ rows, sellerSlug, days }: DropBreakdownTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-sakura-mist">No drop activity in this period.</p>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article
            key={row.dropId}
            className="rounded-lg border border-sakura-petal p-4"
          >
            <Link
              href={buildAnalyticsHref({ days, dropId: row.dropId })}
              className="font-medium text-sakura-ink hover:text-sakura-dusk"
            >
              {row.dropTitle}
            </Link>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Views</dt>
                <dd className="font-mono">{row.views}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Waitlist</dt>
                <dd className="font-mono">{row.waitlistSignups}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Paid orders</dt>
                <dd className="font-mono">{row.paidOrders}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Revenue</dt>
                <dd className="font-mono">{formatPrice(row.revenueCents, "USD")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Conversion</dt>
                <dd>{row.conversionRate.toFixed(1)}%</dd>
              </div>
            </dl>
            <Link
              href={`/${sellerSlug}/${row.dropSlug}`}
              className="mt-3 inline-block text-xs text-sakura-dusk hover:underline"
              target="_blank"
            >
              Open drop page
            </Link>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-sakura-petal md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
              <tr>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Waitlist</th>
                <th className="px-4 py-3">Checkouts</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.dropId} className="border-b border-sakura-petal last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={buildAnalyticsHref({ days, dropId: row.dropId })}
                      className="font-medium text-sakura-ink hover:text-sakura-dusk"
                    >
                      {row.dropTitle}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono">{row.views}</td>
                  <td className="px-4 py-3 font-mono">{row.waitlistSignups}</td>
                  <td className="px-4 py-3 font-mono">{row.checkouts}</td>
                  <td className="px-4 py-3 font-mono">{row.paidOrders}</td>
                  <td className="px-4 py-3 font-mono">
                    {formatPrice(row.revenueCents, "USD")}
                  </td>
                  <td className="px-4 py-3">{row.conversionRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
