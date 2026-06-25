import Link from "next/link";
import { redirect } from "next/navigation";

import { DropDeleteButton } from "@/components/dashboard/drop-delete-button";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { toPublicDrop } from "@/lib/drop-status";

export default async function DropsPage() {
  const session = await getSellerSession();
  if (!session) redirect("/dashboard/login");

  const drops = await listSellerDrops(session.sellerSlug);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sakura-ink">Drops</h1>
        <Link
          href="/dashboard/drops/new"
          className="rounded-md bg-sakura-dusk px-4 py-2 text-sm font-medium text-sakura-paper hover:bg-sakura-bloom"
        >
          New drop
        </Link>
      </div>

      {drops.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-10 text-center">
          <p className="text-sakura-stone">No drops yet.</p>
          <Link
            href="/dashboard/drops/new"
            className="mt-3 inline-block text-sm font-medium text-sakura-dusk hover:underline"
          >
            Create your first drop
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-sakura-petal">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Publish</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Inventory</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {drops.map((drop) => {
                const publicDrop = toPublicDrop(drop);
                return (
                  <tr
                    key={drop.id}
                    className="border-b border-sakura-petal last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-sakura-ink">
                      <Link
                        href={`/dashboard/drops/${drop.id}`}
                        className="hover:text-sakura-dusk"
                      >
                        {drop.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-sakura-stone">
                      {drop.publishStatus}
                    </td>
                    <td className="px-4 py-3 capitalize text-sakura-stone">
                      {publicDrop.status.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 font-mono text-sakura-stone">
                      {drop.inventoryRemaining} / {drop.inventoryTotal}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={
                            drop.publishStatus === "published"
                              ? `/${drop.sellerSlug}/${drop.slug}`
                              : `/${drop.sellerSlug}/${drop.slug}?preview=1`
                          }
                          className="text-sakura-dusk hover:underline"
                          target="_blank"
                        >
                          Preview
                        </Link>
                        <DropDeleteButton
                          dropId={drop.id}
                          dropTitle={drop.title}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
