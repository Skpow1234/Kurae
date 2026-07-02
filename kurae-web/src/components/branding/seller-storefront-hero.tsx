import Image from "next/image";

import { shouldUnoptimizeImageSrc } from "@/lib/images";
import type { PublicSeller } from "@/lib/types";

type SellerStorefrontHeroProps = {
  profile: PublicSeller;
  liveCount: number;
  referralActive?: boolean;
};

export function SellerStorefrontHero({
  profile,
  liveCount,
  referralActive = false,
}: SellerStorefrontHeroProps) {
  const hasLogo = Boolean(profile.logoUrl?.trim());

  let subtitle: string;
  if (referralActive) {
    subtitle =
      liveCount > 0
        ? "Referral link active — shop live drops below."
        : "Referral link active — drops appear here when they go live.";
  } else if (liveCount > 0) {
    subtitle = `${liveCount} live drop${liveCount === 1 ? "" : "s"} — limited releases from ${profile.name}.`;
  } else {
    subtitle = "No live drops right now — check back soon.";
  }

  return (
    <section className="border-b border-sakura-petal bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4 py-12 sm:py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center">
        {hasLogo ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-sakura-petal ring-2 ring-brand-accent/40 sm:h-24 sm:w-24">
            <Image
              src={profile.logoUrl!}
              alt={`${profile.name} logo`}
              fill
              className="object-cover"
              sizes="96px"
              priority
              unoptimized={shouldUnoptimizeImageSrc(profile.logoUrl!)}
            />
          </div>
        ) : (
          <div className="brand-accent-soft flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-sakura-ink sm:h-24 sm:w-24 sm:text-3xl">
            {profile.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-widest text-sakura-mist">
            Storefront
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-sakura-ink sm:text-4xl">
            {profile.name}
          </h1>
          {profile.bio?.trim() && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-sakura-stone sm:text-base">
              {profile.bio}
            </p>
          )}
          <p className="mt-3 max-w-2xl text-sm text-sakura-mist">{subtitle}</p>
        </div>
      </div>
    </section>
  );
}
