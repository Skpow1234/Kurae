import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DropBrowseCard } from "@/components/drop/drop-browse-card";
import { SellerReferralCapture } from "@/components/referral/seller-referral-capture";
import { fetchPublicSeller, listPublicDrops } from "@/lib/api/drops-server";

type PageProps = {
  params: Promise<{ seller: string }>;
  searchParams: Promise<{ ref?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { seller } = await params;
  const profile = await fetchPublicSeller(seller);

  if (!profile) {
    return { title: "Seller not found" };
  }

  return {
    title: profile.name,
    description: `Shop limited drops from ${profile.name} on Kurae.`,
  };
}

export default async function SellerReferralPage({
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

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-sakura-paper">
      <SellerReferralCapture sellerSlug={seller} refCode={ref} />

      <section className="border-b border-sakura-petal bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs uppercase tracking-widest text-sakura-mist">Shop</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-sakura-ink">
            {profile.name}
          </h1>
          {profile.bio && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-sakura-stone">
              {profile.bio}
            </p>
          )}
          <p className="mt-2 max-w-xl text-sm text-sakura-mist">
            {ref?.trim()
              ? "Referral link active — browse drops below when they go live."
              : sellerDrops.length > 0
                ? "Browse live drops from this seller."
                : "No live drops yet — check back soon."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {sellerDrops.length > 0 ? (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-sakura-ink">Live drops</h2>
              <p className="mt-1 text-sm text-sakura-mist">
                Pick a drop to view sizes and checkout.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sellerDrops.map((drop, index) => (
                <DropBrowseCard key={drop.id} drop={drop} priority={index < 3} />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-sakura-petal p-12 text-center">
            <p className="text-sakura-stone">No published drops yet.</p>
            <p className="mt-2 text-sm text-sakura-mist">
              Share this link now — referral credit applies when drops go live.
            </p>
          </div>
        )}
        <p className="mt-8 text-center text-sm text-sakura-mist">
          <Link href="/" className="text-sakura-dusk hover:underline">
            Browse all sellers
          </Link>
        </p>
      </section>
    </main>
  );
}
