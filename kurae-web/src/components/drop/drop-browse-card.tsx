import Image from "next/image";
import Link from "next/link";

import { getStatusLabel } from "@/lib/drop-status";
import type { PublicDrop } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { shouldUnoptimizeImageSrc } from "@/lib/images";

type DropBrowseCardProps = {
  drop: PublicDrop;
};

const statusStyles: Record<PublicDrop["status"], string> = {
  live: "bg-sakura-blush/20 text-sakura-ink",
  upcoming: "bg-sakura-surface text-sakura-dusk",
  sold_out: "bg-sakura-mist/20 text-sakura-stone",
  expired: "bg-sakura-mist/20 text-sakura-stone",
};

export function DropBrowseCard({ drop }: DropBrowseCardProps) {
  const href = `/${drop.sellerSlug}/${drop.slug}`;

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-lg border border-sakura-petal bg-sakura-paper transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] bg-sakura-surface">
        {drop.heroImageUrl ? (
          <Image
            src={drop.heroImageUrl}
            alt={drop.title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized={shouldUnoptimizeImageSrc(drop.heroImageUrl)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-sakura-mist">
            No image
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyles[drop.status]}`}
        >
          {getStatusLabel(drop.status)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs uppercase tracking-widest text-sakura-mist">
          {drop.sellerName}
        </p>
        <h3 className="mt-1 font-semibold text-sakura-ink group-hover:text-sakura-dusk">
          {drop.title}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-3 text-sm">
          <span className="font-mono font-semibold text-sakura-dusk">
            {formatPrice(drop.priceCents, drop.currency)}
          </span>
          {drop.status === "live" && (
            <span className="font-mono text-xs text-sakura-bloom">
              {drop.inventoryRemaining} left
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
