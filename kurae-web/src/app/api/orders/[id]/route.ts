import { NextResponse } from "next/server";

import { isApiConfigured } from "@/lib/api/config";
import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";
import { getOrderById } from "@/lib/mock/order-store";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (isApiConfigured()) {
    const token = await readToken();
    const res = await proxyToApi(`/orders/${id}`, { method: "GET" }, token);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  const order = getOrderById(id);
  if (!order || order.sellerSlug !== session.sellerSlug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ order });
}
