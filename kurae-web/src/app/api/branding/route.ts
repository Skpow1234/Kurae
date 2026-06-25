import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await readToken();
  const res = await proxyToApi("/branding", { method: "GET" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: Request) {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const token = await readToken();
  const res = await proxyToApi(
    "/branding",
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
