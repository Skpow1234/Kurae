import { NextResponse } from "next/server";

import { getApiBase, isApiConfigured } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = await request.json();
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  if (!isApiConfigured()) {
    return NextResponse.json(
      {
        orderId: `ord_mock_${Date.now()}`,
        clientSecret: "pi_mock_secret",
        amountCents: 8900,
        currency: "USD",
        reservationUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        status: "payment_pending",
      },
      { status: 201 },
    );
  }

  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")}/checkout`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
