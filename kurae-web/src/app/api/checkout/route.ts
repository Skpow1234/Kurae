import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getBuyerSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getBuyerSession();
  if (!session) {
    return NextResponse.json({ error: "Buyer sign in required" }, { status: 401 });
  }

  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    dropId?: string;
    sizeLabel?: string;
    idempotencyKey?: string;
  };

  if (!body.dropId?.trim() || !body.sizeLabel?.trim()) {
    return NextResponse.json(
      { error: "dropId and sizeLabel are required" },
      { status: 400 },
    );
  }

  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? body.idempotencyKey;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const res = await fetch(`${requireApiBase()}/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dropId: body.dropId.trim(),
      buyerEmail: session.email,
      sizeLabel: body.sizeLabel.trim(),
      idempotencyKey,
    }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
