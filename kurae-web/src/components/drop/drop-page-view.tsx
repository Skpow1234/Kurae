"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { PageViewCapture } from "@/components/analytics/page-view-capture";
import { DropHero } from "@/components/drop/drop-hero";
import { SellerBrandCard } from "@/components/branding/seller-brand-card";
import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { ReferralCapture } from "@/components/referral/referral-capture";
import { ReferralProgress } from "@/components/referral/referral-progress";
import { DropStatusBanner } from "@/components/drop/drop-status-banner";
import { PromoStrip } from "@/components/drop/promo-strip";
import { PublicNav } from "@/components/drop/public-nav";
import { ProductPicker } from "@/components/drop/product-picker";
import { PurchaseSection } from "@/components/drop/purchase-section";
import { ShareButton } from "@/components/drop/share-button";
import { StickyCtaBar } from "@/components/drop/sticky-cta-bar";
import { WaitlistForm } from "@/components/drop/waitlist-form";
import { useCart } from "@/contexts/cart-context";
import { useDropInventory } from "@/lib/hooks/use-drop-inventory";
import { findDropProduct, resolveDropProducts } from "@/lib/drop-products";
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
    startsAt: initialDrop.startsAt,
    endsAt: initialDrop.endsAt,
  });

  const drop: PublicDrop = {
    ...initialDrop,
    inventoryRemaining: inventory.remaining,
    status: inventory.status,
  };

  const products = resolveDropProducts(initialDrop);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    () => products.find((product) => product.inventoryRemaining > 0)?.id ?? products[0]?.id ?? "",
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const selectedProduct =
    findDropProduct(drop, selectedProductId) ?? products[0] ?? null;

  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    setSelectedSize(null);
  }, [setSelectedProductId, setSelectedSize]);
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
      <PageViewCapture dropId={drop.id} />
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
        dropStatus={drop.status}
      />

      <DropHero drop={drop} onCountdownComplete={inventory.refresh} />

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

        {refCode?.trim() && (
          <ReferralProgress
            dropId={drop.id}
            sellerSlug={drop.sellerSlug}
            dropSlug={drop.slug}
            code={refCode.trim()}
          />
        )}

        {isLive && selectedProduct && (
          <div ref={purchaseRef} className="space-y-6">
            <ProductPicker
              products={products}
              currency={drop.currency}
              selectedId={selectedProductId}
              onSelect={handleSelectProduct}
            />
            <PurchaseSection
              drop={drop}
              product={selectedProduct}
              selectedSizeId={selectedSize}
              onSelectSize={setSelectedSize}
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
          <Link href="/privacy" className="hover:text-sakura-dusk">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-sakura-dusk">
            Terms
          </Link>
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
