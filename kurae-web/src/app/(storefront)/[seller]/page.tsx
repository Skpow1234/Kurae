import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { SellerStorefrontHero } from "@/components/branding/seller-storefront-hero";
import { DropBrowseCard } from "@/components/drop/drop-browse-card";
import { SellerReferralCapture } from "@/components/referral/seller-referral-capture";
import { fetchPublicSeller, listPublicDrops } from "@/lib/api/drops-server";
import {
  buildReferralOgImagePath,
  buildReferralPageDescription,
  buildReferralPageTitle,
  buildReferralShareUrl,
  fetchReferralPreviewServer,
} from "@/lib/referral-preview";
import type { PublicDrop } from "@/lib/types";

type PageProps = {
  params: Promise<{ seller: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { seller } = await params;
  const { ref } = await searchParams;
  const profile = await fetchPublicSeller(seller);

  if (!profile) {
    return { title: "Seller not found" };
  }

  const refCode = ref?.trim();
  if (refCode) {
    const referralPreview = await fetchReferralPreviewServer({
      sellerSlug: seller,
      code: refCode,
    });

    if (referralPreview) {
      const title = buildReferralPageTitle(referralPreview);
      const description = buildReferralPageDescription(referralPreview);
      const ogImage = buildReferralOgImagePath({
        sellerSlug: seller,
        code: refCode,
      });
      const pageUrl = buildReferralShareUrl({
        sellerSlug: seller,
        code: refCode,
      });

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: pageUrl,
          images: [{ url: ogImage, width: 1200, height: 630 }],
          type: "website",
        },
        twitter: {
          card: "summary_large_image",
          title,
          description,
          images: [ogImage],
        },
      };
    }
  }

  const description =
    profile.bio?.trim() ||
    `Shop limited drops from ${profile.name} on Kurae.`;

  const images = profile.logoUrl?.trim()
    ? [{ url: profile.logoUrl }]
    : undefined;

  return {
    title: profile.name,
    description,
    openGraph: {
      title: profile.name,
      description,
      images,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: profile.name,
      description,
      images: profile.logoUrl ? [profile.logoUrl] : undefined,
    },
  };
}

function DropGridSection({
  title,
  description,
  drops,
}: {
  title: string;
  description: string;
  drops: PublicDrop[];
}) {
  if (drops.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-sakura-ink">{title}</h2>
        <p className="mt-1 text-sm text-sakura-mist">{description}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {drops.map((drop, index) => (
          <DropBrowseCard key={drop.id} drop={drop} priority={index < 3} branded />
        ))}
      </div>
    </section>
  );
}

export default async function SellerStorefrontPage({
  params,
  searchParams,
}: PageProps) {
  const { seller } = await params;
  const { ref } = await searchParams;

  const [profile, publicDrops] = await Promise.all([
    fetchPublicSeller(seller),
    listPublicDrops().catch(() => []),
  ]);

  if (!profile) {
    notFound();
  }

  const sellerDrops = publicDrops.filter((drop) => drop.sellerSlug === seller);
  const liveDrops = sellerDrops.filter((drop) => drop.status === "live");
  const upcomingDrops = sellerDrops.filter((drop) => drop.status === "upcoming");
  const soldOutDrops = sellerDrops.filter((drop) => drop.status === "sold_out");
  const hasVisibleDrops =
    liveDrops.length + upcomingDrops.length + soldOutDrops.length > 0;

  return (
    <SellerBrandTheme accent={profile.accent}>
      <main className="min-h-[calc(100vh-3.5rem)] bg-sakura-paper">
        <SellerReferralCapture sellerSlug={seller} refCode={ref} />

        <SellerStorefrontHero
          profile={profile}
          liveCount={liveDrops.length}
          referralActive={Boolean(ref?.trim())}
        />

        {hasVisibleDrops ? (
          <>
            <DropGridSection
              title="Live now"
              description="Available to buy — choose your size and check out."
              drops={liveDrops}
            />
            <DropGridSection
              title="Coming soon"
              description="Join the waitlist before the countdown ends."
              drops={upcomingDrops}
            />
            <DropGridSection
              title="Sold out"
              description="Past releases from this seller."
              drops={soldOutDrops}
            />
          </>
        ) : (
          <section className="mx-auto max-w-6xl px-4 py-10">
            <div className="rounded-lg border border-dashed border-sakura-petal p-12 text-center">
              <p className="text-sakura-stone">No published drops yet.</p>
              <p className="mt-2 text-sm text-sakura-mist">
                {ref?.trim()
                  ? "Share this link — referral credit applies when drops go live."
                  : "Follow this storefront for the next release."}
              </p>
            </div>
          </section>
        )}

        <p className="pb-10 text-center text-sm text-sakura-mist">
          <Link href="/" className="brand-accent-link hover:underline">
            Browse all sellers
          </Link>
        </p>
      </main>
    </SellerBrandTheme>
  );
}
