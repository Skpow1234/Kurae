import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const token = await readToken();
  const res = await proxyToApi(`/orders${url.search}`, { method: "GET" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
