import { redirect } from "next/navigation";

import { DiscountForm } from "@/components/dashboard/discount-form";
import { DiscountsTable } from "@/components/dashboard/discounts-table";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listDiscountCodes } from "@/lib/api/discounts-server";
import { listSellerDrops } from "@/lib/api/drops-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import { requireTeamRole } from "@/lib/require-team-role";

export default async function DiscountsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/discounts" }));
  requireTeamRole(session.teamRole, ["owner", "admin"]);

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
        <DiscountsTable codes={codes} drops={drops} />
      )}

      <DiscountForm drops={drops} />
    </div>
  );
}
