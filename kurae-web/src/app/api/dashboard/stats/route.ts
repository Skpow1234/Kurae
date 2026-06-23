import { NextResponse } from "next/server";

import { isApiConfigured } from "@/lib/api/config";
import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";
import { getDashboardStats } from "@/lib/mock/order-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi("/dashboard/stats", { method: "GET" }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(getDashboardStats(session.sellerSlug));
}
