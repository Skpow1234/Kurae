import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getPublicDrop } from "@/lib/mock/drop-store";

type RouteContext = {
  params: Promise<{ seller: string; drop: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { seller, drop: dropSlug } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const session = await getSession();
  const allowDraft = preview && session?.sellerSlug === seller;

  const drop = getPublicDrop(seller, dropSlug, { allowDraft });
  if (!drop) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ drop });
}
