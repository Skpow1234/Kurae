import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  createDrop,
  listDropsBySeller,
  toPublicDrop,
} from "@/lib/mock/drop-store";
import type { PublishStatus, DropSize } from "@/lib/types";
import { fromDatetimeLocalValue } from "@/lib/validation/drop";

const defaultSizes = [
  { id: "s", label: "S", available: true },
  { id: "m", label: "M", available: true },
  { id: "l", label: "L", available: true },
  { id: "xl", label: "XL", available: true },
];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const drops = listDropsBySeller(session.sellerSlug).map((drop) => ({
    ...drop,
    publicStatus: toPublicDrop(drop).status,
  }));

  return NextResponse.json({ drops });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    title: string;
    slug: string;
    description: string;
    story: string;
    priceCents: number;
    inventoryTotal: number;
    startsAt: string;
    endsAt: string;
    promoMessage: string | null;
    heroImageUrl: string;
    galleryImageUrls: string[];
    sizes: DropSize[];
    publishStatus: PublishStatus;
  };

  const drop = createDrop({
    sellerSlug: session.sellerSlug,
    sellerName: session.sellerName,
    slug: body.slug,
    title: body.title,
    description: body.description,
    story: body.story,
    priceCents: body.priceCents,
    currency: "USD",
    heroImageUrl: body.heroImageUrl,
    galleryImageUrls: body.galleryImageUrls,
    inventoryTotal: body.inventoryTotal,
    startsAt: body.startsAt.includes("T")
      ? fromDatetimeLocalValue(body.startsAt)
      : body.startsAt,
    endsAt: body.endsAt.includes("T")
      ? fromDatetimeLocalValue(body.endsAt)
      : body.endsAt,
    promoMessage: body.promoMessage,
    sizes: body.sizes?.length ? body.sizes : defaultSizes,
    publishStatus: body.publishStatus,
  });

  return NextResponse.json({ drop }, { status: 201 });
}
