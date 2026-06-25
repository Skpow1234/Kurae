import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { getAuthToken } from "@/lib/api/server";
import { getSellerSession } from "@/lib/auth/session";

const PUBLIC_REVALIDATE_SECONDS = 15;

type RouteContext = {
  params: Promise<{ seller: string; drop: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { seller, drop: dropSlug } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const session = await getSellerSession();
  const allowDraft = preview && session?.sellerSlug === seller;

  const base = requireApiBase();
  const headers: HeadersInit = {};
  if (allowDraft) {
    const token = await getAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const qs = allowDraft ? "?preview=1" : "";
  const res = await fetch(`${base}/public/${seller}/${dropSlug}${qs}`, {
    headers,
    ...(allowDraft
      ? { cache: "no-store" as const }
      : { next: { revalidate: PUBLIC_REVALIDATE_SECONDS } }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  const drop = await res.json();
  return NextResponse.json(
    { drop },
    allowDraft
      ? undefined
      : {
          headers: {
            "Cache-Control": `private, max-age=${PUBLIC_REVALIDATE_SECONDS}`,
          },
        },
  );
}
