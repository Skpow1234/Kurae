import { NextResponse } from "next/server";

import { apiPublicFetch } from "@/lib/api/server";
import type { PublicSeller } from "@/lib/types";

type RouteContext = {
  params: Promise<{ seller: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { seller } = await context.params;

  try {
    const profile = await apiPublicFetch<PublicSeller>(`/public/sellers/${seller}`);
    return NextResponse.json({ seller: profile });
  } catch {
    return NextResponse.json({ error: "Seller not found" }, { status: 404 });
  }
}
