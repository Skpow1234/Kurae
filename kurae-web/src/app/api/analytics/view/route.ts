import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sellerSlug?: string;
    dropId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
  };

  const sellerSlug = body.sellerSlug?.trim();
  const dropId = body.dropId?.trim();

  if (!sellerSlug && !dropId) {
    return NextResponse.json(
      { error: "sellerSlug or dropId is required" },
      { status: 400 },
    );
  }

  if (sellerSlug) {
    const res = await fetch(`${requireApiBase()}/public/analytics/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerSlug,
        dropId,
        utmSource: body.utmSource?.trim(),
        utmMedium: body.utmMedium?.trim(),
        utmCampaign: body.utmCampaign?.trim(),
        utmTerm: body.utmTerm?.trim(),
        utmContent: body.utmContent?.trim(),
      }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  if (!dropId) {
    return NextResponse.json({ error: "dropId is required" }, { status: 400 });
  }

  const res = await fetch(`${requireApiBase()}/public/analytics/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropId }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
