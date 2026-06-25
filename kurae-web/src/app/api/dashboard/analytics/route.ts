import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSellerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await readToken();
  const res = await proxyToApi("/dashboard/analytics", { method: "GET" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
