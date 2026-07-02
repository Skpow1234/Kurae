import Link from "next/link";

import { DropDeleteButton } from "@/components/dashboard/drop-delete-button";
import type { SellerDrop } from "@/lib/types";
import { toPublicDrop } from "@/lib/drop-status";
import { formatDropPublishStatus } from "@/lib/drop-publish";

type DropsTableProps = {
  drops: SellerDrop[];
};

function previewHref(drop: SellerDrop) {
  return drop.publishStatus === "published"
    ? `/${drop.sellerSlug}/${drop.slug}`
    : `/${drop.sellerSlug}/${drop.slug}?preview=1`;
}

export function DropsTable({ drops }: DropsTableProps) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {drops.map((drop) => {
          const publicDrop = toPublicDrop(drop);

          return (
            <article
              key={drop.id}
              className="rounded-lg border border-sakura-petal p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/dashboard/drops/${drop.id}`}
                  className="font-medium text-sakura-ink hover:text-sakura-dusk"
                >
                  {drop.title}
                </Link>
                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <Link
                    href={previewHref(drop)}
                    className="text-sakura-dusk hover:underline"
                    target="_blank"
                  >
                    Preview
                  </Link>
                  <DropDeleteButton dropId={drop.id} dropTitle={drop.title} />
                </div>
              </div>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-sakura-mist">Publish</dt>
                  <dd className="text-sakura-stone">
                    {formatDropPublishStatus(drop.publishStatus, drop.startsAt)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sakura-mist">State</dt>
                  <dd className="capitalize text-sakura-stone">
                    {publicDrop.status.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-sakura-mist">Inventory</dt>
                  <dd className="font-mono text-sakura-stone">
                    {drop.inventoryRemaining} / {drop.inventoryTotal}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-lg border border-sakura-petal md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
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
                    <td className="px-4 py-3 text-sakura-stone">
                      {formatDropPublishStatus(drop.publishStatus, drop.startsAt)}
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
                          href={previewHref(drop)}
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
      </div>
    </>
  );
}
