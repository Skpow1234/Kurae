import Link from "next/link";
import { redirect } from "next/navigation";

import { DropsTable } from "@/components/dashboard/drops-table";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { canWriteDrops } from "@/lib/team-permissions";

export default async function DropsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  const canCreate = canWriteDrops(session.teamRole);

  let drops;
  try {
    drops = await listSellerDrops();
  } catch {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-sakura-ink">Drops</h1>
        <ApiLoadError message="Could not load drops. Check that kurae-api is running." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sakura-ink">Drops</h1>
        {canCreate && (
          <Link
            href="/dashboard/drops/new"
            className="rounded-md bg-sakura-dusk px-4 py-2 text-sm font-medium text-sakura-paper hover:bg-sakura-bloom"
          >
            New drop
          </Link>
        )}
      </div>

      {drops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-10 text-center">
          <p className="text-sakura-stone">No drops yet.</p>
          {canCreate && (
            <Link
              href="/dashboard/drops/new"
              className="mt-3 inline-block text-sm font-medium text-sakura-dusk hover:underline"
            >
              Create your first drop
            </Link>
          )}
        </div>
      ) : (
        <DropsTable drops={drops} canClone={canCreate} />
      )}
    </div>
  );
}
