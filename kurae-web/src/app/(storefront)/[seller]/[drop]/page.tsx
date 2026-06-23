import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DropPageView } from "@/components/drop/drop-page-view";
import { fetchPublicDrop } from "@/lib/api/drops";

type PageProps = {
  params: Promise<{ seller: string; drop: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { seller, drop: dropSlug } = await params;
  const drop = await fetchPublicDrop(seller, dropSlug);

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

export default async function PublicDropPage({ params }: PageProps) {
  const { seller, drop: dropSlug } = await params;
  const drop = await fetchPublicDrop(seller, dropSlug);

  if (!drop) {
    notFound();
  }

  return <DropPageView drop={drop} />;
}
