import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = await request.json();
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${requireApiBase()}/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
