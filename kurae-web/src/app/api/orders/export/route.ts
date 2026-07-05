import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const path = qs ? `/orders/export?${qs}` : "/orders/export";

  const token = await readToken();
  const res = await proxyToApi(path, { method: "GET" }, token);
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Export failed" }));
    return NextResponse.json(data, { status: res.status });
  }

  const csv = await res.text();
  const disposition = res.headers.get("Content-Disposition");
  const headers = new Headers({
    "Content-Type": "text/csv; charset=utf-8",
  });
  if (disposition) {
    headers.set("Content-Disposition", disposition);
  }

  return new NextResponse(csv, { status: 200, headers });
}
