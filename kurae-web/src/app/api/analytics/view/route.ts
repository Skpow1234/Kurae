import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function POST(request: Request) {
  const body = (await request.json()) as { dropId?: string };

  if (!body.dropId?.trim()) {
    return NextResponse.json({ error: "dropId is required" }, { status: 400 });
  }

  const res = await fetch(`${requireApiBase()}/public/analytics/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropId: body.dropId.trim() }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
