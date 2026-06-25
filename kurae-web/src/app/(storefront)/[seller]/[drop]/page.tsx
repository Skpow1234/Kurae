import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DropPageView } from "@/components/drop/drop-page-view";
import { fetchPublicDrop } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";

type PageProps = {
  params: Promise<{ seller: string; drop: string }>;
  searchParams: Promise<{ preview?: string; ref?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const { seller, drop: dropSlug } = await params;
  const { preview } = await searchParams;
  const session = await getSellerSession();
  const allowDraft = preview === "1" && session?.sellerSlug === seller;
  const drop = await fetchPublicDrop(seller, dropSlug, { allowDraft });

  if (!drop) {
    return { title: "Drop not found" };
  }

  return {
    title: drop.title,
    description: drop.description,
    openGraph: {
      title: drop.title,
      description: drop.description,
      images: [{ url: drop.heroImageUrl }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: drop.title,
      description: drop.description,
      images: [drop.heroImageUrl],
    },
  };
}

export default async function PublicDropPage({
  params,
  searchParams,
}: PageProps) {
  const { seller, drop: dropSlug } = await params;
  const { preview, ref } = await searchParams;
  const session = await getSellerSession();
  const allowDraft = preview === "1" && session?.sellerSlug === seller;
  const drop = await fetchPublicDrop(seller, dropSlug, { allowDraft });

  if (!drop) {
    notFound();
  }

  return <DropPageView drop={drop} isPreview={allowDraft} refCode={ref} />;
}
