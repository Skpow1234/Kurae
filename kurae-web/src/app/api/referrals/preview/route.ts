import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  const sellerSlug = searchParams.get("sellerSlug")?.trim();
  const dropSlug = searchParams.get("dropSlug")?.trim();
  const dropId = searchParams.get("dropId")?.trim();

  if (!code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  if (!sellerSlug && !dropId) {
    return NextResponse.json(
      { error: "sellerSlug or dropId is required" },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams({ code: code.toUpperCase() });
  if (sellerSlug) {
    qs.set("sellerSlug", sellerSlug);
    if (dropSlug) qs.set("dropSlug", dropSlug);
  } else if (dropId) {
    qs.set("dropId", dropId);
  }

  const res = await fetch(`${requireApiBase()}/public/referrals/preview?${qs}`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
