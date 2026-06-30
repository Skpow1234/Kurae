import { redirect } from "next/navigation";

import { DiscountDeleteButton } from "@/components/dashboard/discount-delete-button";
import { DiscountForm } from "@/components/dashboard/discount-form";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listDiscountCodes } from "@/lib/api/discounts-server";
import { listSellerDrops } from "@/lib/api/drops-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import type { DiscountCode } from "@/lib/types/discount";
import { formatPrice } from "@/lib/utils";

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

export default async function DiscountsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/discounts" }));

  let codes;
  let drops;
  try {
    [codes, drops] = await Promise.all([
      listDiscountCodes(),
      listSellerDrops(),
    ]);
  } catch {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">Discount codes</h1>
        </div>
        <ApiLoadError message="Could not load discount codes. Check that kurae-api is running." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Discount codes</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Create codes buyers can apply at checkout. Discounts are validated server-side.
        </p>
      </div>

      {codes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-8 text-center text-sm text-sakura-stone">
          No discount codes yet. Create one below.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-sakura-petal">
          <table className="w-full text-left text-sm">
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
                  <td className="px-4 py-3 text-sakura-mist">{formatExpires(c.expiresAt)}</td>
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
      )}

      <DiscountForm drops={drops} />
    </div>
  );
}
