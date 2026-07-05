import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const token = await readToken();
  const res = await proxyToApi(`/drops/${id}/clone`, { method: "POST" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
