import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const email = new URL(request.url).searchParams.get("email");
  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams({ email });
  const res = await fetch(
    `${requireApiBase()}/checkout/orders/${id}/status?${qs.toString()}`,
    { cache: "no-store" },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
