import { NextResponse } from "next/server";

import { isApiConfigured } from "@/lib/api/config";
import { proxyToApi, readToken } from "@/lib/api/proxy";
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

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi("/drops", { method: "GET" }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
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

  const body = (await request.json()) as Record<string, unknown>;

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi(
      "/drops",
      { method: "POST", body: JSON.stringify(body) },
      token,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  const typed = body as {
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
    slug: typed.slug,
    title: typed.title,
    description: typed.description,
    story: typed.story,
    priceCents: typed.priceCents,
    currency: "USD",
    heroImageUrl: typed.heroImageUrl,
    galleryImageUrls: typed.galleryImageUrls,
    inventoryTotal: typed.inventoryTotal,
    startsAt: typed.startsAt.includes("T")
      ? fromDatetimeLocalValue(typed.startsAt)
      : typed.startsAt,
    endsAt: typed.endsAt.includes("T")
      ? fromDatetimeLocalValue(typed.endsAt)
      : typed.endsAt,
    promoMessage: typed.promoMessage,
    sizes: typed.sizes?.length ? typed.sizes : defaultSizes,
    publishStatus: typed.publishStatus,
  });

  return NextResponse.json({ drop }, { status: 201 });
}
