import { DiscountDeleteButton } from "@/components/dashboard/discount-delete-button";
import type { DiscountCode } from "@/lib/types/discount";
import { formatPrice } from "@/lib/utils";

type DiscountsTableProps = {
  codes: DiscountCode[];
};

function formatDiscountLabel(code: DiscountCode): string {
  if (code.type === "percent") {
    return `${code.value}% off`;
  }
  return `${formatPrice(code.value, "USD")} off`;
}

function formatUses(code: DiscountCode): string {
  if (code.maxUses != null) {
    return `${code.usesCount} / ${code.maxUses}`;
  }
  return String(code.usesCount);
}

function formatExpires(expiresAt?: string): string {
  if (!expiresAt) return "—";
  return new Date(expiresAt).toLocaleDateString();
}

export function DiscountsTable({ codes }: DiscountsTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {codes.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-sakura-petal p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-mono font-medium text-sakura-ink">{c.code}</p>
              <DiscountDeleteButton
                id={c.id}
                code={c.code}
                usesCount={c.usesCount}
              />
            </div>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Discount</dt>
                <dd>{formatDiscountLabel(c)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Scope</dt>
                <dd className="text-right text-sakura-mist">
                  {c.dropTitle ?? "All drops"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Uses</dt>
                <dd className="font-mono">{formatUses(c)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-sakura-mist">Expires</dt>
                <dd className="text-sakura-mist">{formatExpires(c.expiresAt)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-sakura-petal md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id} className="border-b border-sakura-petal last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                  <td className="px-4 py-3">{formatDiscountLabel(c)}</td>
                  <td className="px-4 py-3 text-sakura-mist">
                    {c.dropTitle ?? "All drops"}
                  </td>
                  <td className="px-4 py-3 font-mono">{formatUses(c)}</td>
                  <td className="px-4 py-3 text-sakura-mist">
                    {formatExpires(c.expiresAt)}
                  </td>
                  <td className="px-4 py-3">
                    <DiscountDeleteButton
                      id={c.id}
                      code={c.code}
                      usesCount={c.usesCount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
