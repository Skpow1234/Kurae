import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { getAuthToken } from "@/lib/api/server";
import { getSession } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ seller: string; drop: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { seller, drop: dropSlug } = await context.params;
  const preview = new URL(request.url).searchParams.get("preview") === "1";
  const session = await getSession();
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
    cache: "no-store",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Not found" }, { status: res.status });
  }
  const drop = await res.json();
  return NextResponse.json({ drop });
}
