import { NextResponse } from "next/server";

import { isApiConfigured } from "@/lib/api/config";
import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";
import { listOrdersBySeller } from "@/lib/mock/order-store";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const qs = url.search;

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi(`/orders${qs}`, { method: "GET" }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  const orders = listOrdersBySeller(session.sellerSlug);
  return NextResponse.json({ orders, total: orders.length, page: 1 });
}
