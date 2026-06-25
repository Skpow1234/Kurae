"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { DropHero } from "@/components/drop/drop-hero";
import { SellerBrandCard } from "@/components/branding/seller-brand-card";
import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { ReferralCapture } from "@/components/referral/referral-capture";
import { DropStatusBanner } from "@/components/drop/drop-status-banner";
import { PromoStrip } from "@/components/drop/promo-strip";
import { PublicNav } from "@/components/drop/public-nav";
import { PurchaseSection } from "@/components/drop/purchase-section";
import { ShareButton } from "@/components/drop/share-button";
import { StickyCtaBar } from "@/components/drop/sticky-cta-bar";
import { WaitlistForm } from "@/components/drop/waitlist-form";
import { useCart } from "@/contexts/cart-context";
import { useDropInventory } from "@/lib/hooks/use-drop-inventory";
import { shouldUnoptimizeImageSrc } from "@/lib/images";
import type { PublicDrop } from "@/lib/types";

type DropPageViewProps = {
  drop: PublicDrop;
  isPreview?: boolean;
  refCode?: string;
};

export function DropPageView({
  drop: initialDrop,
  isPreview = false,
  refCode,
}: DropPageViewProps) {
  const { count } = useCart();
  const inventory = useDropInventory({
    sellerSlug: initialDrop.sellerSlug,
    dropSlug: initialDrop.slug,
    isPreview,
    initialRemaining: initialDrop.inventoryRemaining,
    total: initialDrop.inventoryTotal,
    status: initialDrop.status,
  });

  const drop: PublicDrop = {
    ...initialDrop,
    inventoryRemaining: inventory.remaining,
    status: inventory.status,
  };

  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const purchaseRef = useRef<HTMLDivElement>(null);

  const showWaitlist =
    drop.status === "upcoming" || drop.status === "sold_out";
  const isLive = drop.status === "live";

  const scrollToWaitlist = useCallback(() => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToPurchase = useCallback(() => {
    purchaseRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <SellerBrandTheme accent={drop.sellerAccent}>
      <div className="min-h-screen bg-sakura-paper pb-24 sm:pb-0">
      <ReferralCapture
        dropId={drop.id}
        sellerSlug={drop.sellerSlug}
        refCode={refCode}
      />
      {isPreview && (
        <div className="bg-sakura-petal px-4 py-2 text-center text-xs font-medium text-sakura-dusk">
          Draft preview — only visible to you
        </div>
      )}
      {drop.promoMessage && <PromoStrip message={drop.promoMessage} />}
      <PublicNav
        sellerName={drop.sellerName}
        sellerLogoUrl={drop.sellerLogoUrl}
        dropTitle={drop.title}
        cartCount={count}
      />

      <DropHero drop={drop} />

      <SellerBrandCard
        sellerName={drop.sellerName}
        logoUrl={drop.sellerLogoUrl}
        bio={drop.sellerBio}
      />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        <DropStatusBanner status={drop.status} />

        <div className="flex flex-wrap items-center gap-3">
          <ShareButton title={drop.title} text={drop.description} />
        </div>

        {isLive && (
          <div ref={purchaseRef}>
            <PurchaseSection
              drop={drop}
              selectedSizeId={selectedSize}
              onSelectSize={setSelectedSize}
              inventoryRemaining={drop.inventoryRemaining}
            />
          </div>
        )}

        {showWaitlist && (
          <div ref={waitlistRef}>
            <WaitlistForm
              dropId={drop.id}
              dropTitle={drop.title}
              waitlistCount={drop.waitlistCount}
            />
          </div>
        )}

        <section id="story" className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-sakura-ink">
              The drop
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-sakura-stone sm:text-base">
              {drop.story}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {drop.galleryImageUrls.map((url, i) => (
              <div
                key={url}
                className="relative aspect-[3/4] overflow-hidden rounded-md bg-sakura-surface ring-1 ring-sakura-petal"
              >
                <Image
                  src={url}
                  alt={`${drop.title} gallery ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={shouldUnoptimizeImageSrc(url)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-sakura-petal bg-sakura-surface px-4 py-8 text-center text-xs text-sakura-mist">
        <p>
          © {new Date().getFullYear()} {drop.sellerName} · Powered by Kurae
        </p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="#" className="hover:text-sakura-dusk">
            Privacy
          </a>
          <a href="#" className="hover:text-sakura-dusk">
            Terms
          </a>
        </div>
      </footer>

      <StickyCtaBar
        status={drop.status}
        inventoryRemaining={drop.inventoryRemaining}
        onWaitlistClick={scrollToWaitlist}
        onBuyWithoutSize={scrollToPurchase}
      />
      </div>
    </SellerBrandTheme>
  );
}
