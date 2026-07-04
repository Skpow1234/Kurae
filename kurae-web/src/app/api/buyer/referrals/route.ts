import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getBuyerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getBuyerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await readToken();
  const sellerSlug = new URL(request.url).searchParams.get("sellerSlug");
  const qs = sellerSlug ? `?sellerSlug=${encodeURIComponent(sellerSlug)}` : "";

  const res = await fetch(`${requireApiBase()}/buyer/referrals${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
