import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { dropId?: string; code?: string };

  if (!body.dropId?.trim() || !body.code?.trim()) {
    return NextResponse.json(
      { error: "dropId and code are required" },
      { status: 400 },
    );
  }

  const res = await fetch(`${requireApiBase()}/checkout/discount/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dropId: body.dropId.trim(),
      code: body.code.trim(),
    }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
