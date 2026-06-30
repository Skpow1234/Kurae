import Image from "next/image";

import { shouldUnoptimizeImageSrc } from "@/lib/images";

type SellerBrandCardProps = {
  sellerName: string;
  logoUrl?: string;
  bio?: string;
};

export function SellerBrandCard({
  sellerName,
  logoUrl,
  bio,
}: SellerBrandCardProps) {
  const hasBio = Boolean(bio?.trim());
  const hasLogo = Boolean(logoUrl?.trim());

  if (!hasBio && !hasLogo) {
    return null;
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="flex items-center gap-4 rounded-lg border border-sakura-petal bg-sakura-surface/60 px-4 py-4">
        {logoUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-sakura-petal ring-2 ring-sakura-petal">
            <Image
              src={logoUrl}
              alt={`${sellerName} logo`}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized={shouldUnoptimizeImageSrc(logoUrl)}
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sakura-petal text-lg font-semibold text-sakura-dusk">
            {sellerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-sakura-ink">{sellerName}</p>
          {bio?.trim() && (
            <p className="mt-0.5 text-sm leading-relaxed text-sakura-mist">{bio}</p>
          )}
        </div>
      </div>
    </section>
  );
}
