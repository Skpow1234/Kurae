import { toPublicDrop } from "@/lib/drop-status";
import type { DropStatus, SellerDrop } from "@/lib/types";

const STATUS_PRIORITY: Record<DropStatus, number> = {
  live: 0,
  upcoming: 1,
  sold_out: 2,
  expired: 3,
};

export type StorefrontPreview = {
  href: string;
  label: string;
  dropTitle: string;
};

/** Pick the best drop page for a seller storefront preview link. */
export function getStorefrontPreview(
  drops: SellerDrop[],
): StorefrontPreview | null {
  if (drops.length === 0) return null;

  const ranked = drops
    .map((drop) => {
      const publicDrop = toPublicDrop(drop);
      const priority =
        drop.publishStatus === "draft"
          ? 100
          : STATUS_PRIORITY[publicDrop.status];
      return { drop, publicDrop, priority };
    })
    .sort((a, b) => a.priority - b.priority);

  const best = ranked[0];
  const href =
    best.drop.publishStatus === "published"
      ? `/${best.drop.sellerSlug}/${best.drop.slug}`
      : `/${best.drop.sellerSlug}/${best.drop.slug}?preview=1`;

  const statusLabel = best.publicDrop.status.replace("_", " ");

  return {
    href,
    dropTitle: best.drop.title,
    label:
      best.drop.publishStatus === "draft"
        ? "Preview draft drop"
        : `Preview ${statusLabel} drop`,
  };
}
