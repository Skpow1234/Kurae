import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  getDropById,
  updateDrop,
  toPublicDrop,
} from "@/lib/mock/drop-store";
import type { PublishStatus } from "@/lib/types";
import { fromDatetimeLocalValue } from "@/lib/validation/drop";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const drop = getDropById(id);

  if (!drop || drop.sellerSlug !== session.sellerSlug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    drop: { ...drop, publicStatus: toPublicDrop(drop).status },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = getDropById(id);

  if (!existing || existing.sellerSlug !== session.sellerSlug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Partial<{
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
    publishStatus: PublishStatus;
  }>;

  const patch = {
    ...body,
    startsAt: body.startsAt
      ? body.startsAt.includes("T")
        ? fromDatetimeLocalValue(body.startsAt)
        : body.startsAt
      : undefined,
    endsAt: body.endsAt
      ? body.endsAt.includes("T")
        ? fromDatetimeLocalValue(body.endsAt)
        : body.endsAt
      : undefined,
  };

  const drop = updateDrop(id, patch);
  return NextResponse.json({ drop });
}
