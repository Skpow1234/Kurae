"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { DropHero } from "@/components/drop/drop-hero";
import { PromoStrip } from "@/components/drop/promo-strip";
import { PublicNav } from "@/components/drop/public-nav";
import { SizePicker } from "@/components/drop/size-picker";
import { StickyCtaBar } from "@/components/drop/sticky-cta-bar";
import { WaitlistForm } from "@/components/drop/waitlist-form";
import type { PublicDrop } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

type DropPageViewProps = {
  drop: PublicDrop;
};

export function DropPageView({ drop }: DropPageViewProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const waitlistRef = useRef<HTMLDivElement>(null);
  const showWaitlist =
    drop.status === "upcoming" || drop.status === "sold_out";

  const scrollToWaitlist = useCallback(() => {
    waitlistRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-sakura-paper pb-24 sm:pb-0">
      {drop.promoMessage && <PromoStrip message={drop.promoMessage} />}
      <PublicNav
        sellerName={drop.sellerName}
        dropTitle={drop.title}
        cartCount={drop.status === "live" ? 0 : 0}
      />

      <DropHero drop={drop} />

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {drop.status === "live" && (
          <section className="hidden space-y-6 sm:block">
            <SizePicker
              sizes={drop.sizes}
              selectedId={selectedSize}
              onSelect={setSelectedSize}
            />
            <div className="flex items-center gap-4">
              <Link
                href="/checkout"
                className="inline-flex h-12 items-center justify-center rounded-md bg-sakura-blush px-6 text-base font-medium text-sakura-ink hover:bg-sakura-bloom"
              >
                Buy now — {formatPrice(drop.priceCents, drop.currency)}
              </Link>
              <p className="font-mono text-sm text-sakura-dusk">
                {drop.inventoryRemaining} left
              </p>
            </div>
          </section>
        )}

        {showWaitlist && (
          <div ref={waitlistRef}>
            <WaitlistForm
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
                className="relative aspect-[3/4] overflow-hidden rounded-md bg-sakura-surface"
              >
                <Image
                  src={url}
                  alt={`${drop.title} gallery ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-border bg-sakura-surface px-4 py-8 text-center text-xs text-sakura-mist">
        <p>© {new Date().getFullYear()} {drop.sellerName} · Powered by Kurae</p>
        <div className="mt-2 flex justify-center gap-4">
          <a href="#" className="hover:text-sakura-ink">
            Privacy
          </a>
          <a href="#" className="hover:text-sakura-ink">
            Terms
          </a>
        </div>
      </footer>

      <StickyCtaBar
        status={drop.status}
        inventoryRemaining={drop.inventoryRemaining}
        onWaitlistClick={scrollToWaitlist}
      />
    </div>
  );
}
