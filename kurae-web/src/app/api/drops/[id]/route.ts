import { NextResponse } from "next/server";

import { isApiConfigured } from "@/lib/api/config";
import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";
import {
  getDropById,
  updateDrop,
  toPublicDrop,
} from "@/lib/mock/drop-store";
import type { PublishStatus, DropSize } from "@/lib/types";
import { fromDatetimeLocalValue } from "@/lib/validation/drop";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi(`/drops/${id}`, { method: "GET" }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

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
  const body = await request.json();

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi(
      `/drops/${id}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  const existing = getDropById(id);
  if (!existing || existing.sellerSlug !== session.sellerSlug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const typed = body as Partial<{
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
  }>;

  const patch = {
    ...typed,
    startsAt: typed.startsAt
      ? typed.startsAt.includes("T")
        ? fromDatetimeLocalValue(typed.startsAt)
        : typed.startsAt
      : undefined,
    endsAt: typed.endsAt
      ? typed.endsAt.includes("T")
        ? fromDatetimeLocalValue(typed.endsAt)
        : typed.endsAt
      : undefined,
  };

  const drop = updateDrop(id, patch);
  return NextResponse.json({ drop });
}
