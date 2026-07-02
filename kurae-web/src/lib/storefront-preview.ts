import { toPublicDrop } from "@/lib/drop-status";
import type { DropStatus, SellerDrop } from "@/lib/types";

const STATUS_PRIORITY: Record<DropStatus, number> = {
  live: 0,
  upcoming: 1,
  sold_out: 2,
  expired: 3,
};

export type StorefrontPreview = {
  /** Public seller storefront at /{sellerSlug}. */
  href: string;
  label: string;
  dropTitle: string | null;
  /** Best drop page for previewing a single release, if any drops exist. */
  dropPreviewHref: string | null;
};

function rankDrops(drops: SellerDrop[]) {
  return drops
    .map((drop) => {
      const publicDrop = toPublicDrop(drop);
      const priority =
        drop.publishStatus === "draft" || drop.publishStatus === "scheduled"
          ? 100
          : STATUS_PRIORITY[publicDrop.status];
      return { drop, publicDrop, priority };
    })
    .sort((a, b) => a.priority - b.priority);
}

/** Public seller storefront link plus optional featured drop preview. */
export function getStorefrontPreview(
  sellerSlug: string,
  drops: SellerDrop[],
): StorefrontPreview {
  const href = `/${sellerSlug}`;

  if (drops.length === 0) {
    return {
      href,
      label: "View storefront",
      dropTitle: null,
      dropPreviewHref: null,
    };
  }

  const best = rankDrops(drops)[0];
  const dropPreviewHref =
    best.drop.publishStatus === "published"
      ? `/${best.drop.sellerSlug}/${best.drop.slug}`
      : `/${best.drop.sellerSlug}/${best.drop.slug}?preview=1`;

  return {
    href,
    label: "View storefront",
    dropTitle: best.drop.title,
    dropPreviewHref,
  };
}
