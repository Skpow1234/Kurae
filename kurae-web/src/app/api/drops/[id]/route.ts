import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const token = await readToken();
  const res = await proxyToApi(`/drops/${id}`, { method: "GET" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const token = await readToken();
  const res = await proxyToApi(
    `/drops/${id}`,
    { method: "PATCH", body: JSON.stringify(body) },
    token,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
