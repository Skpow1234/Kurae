import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getBuyerSession } from "@/lib/auth/session";
import { parseReferralCookie, REFERRAL_COOKIE } from "@/lib/referral";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    dropId?: string;
    sizeLabel?: string;
    idempotencyKey?: string;
    discountCode?: string;
    buyerEmail?: string;
  };

  if (!body.dropId?.trim() || !body.sizeLabel?.trim()) {
    return NextResponse.json(
      { error: "dropId and sizeLabel are required" },
      { status: 400 },
    );
  }

  const session = await getBuyerSession();
  const token = await readToken();

  let buyerEmail = body.buyerEmail?.trim() ?? "";
  if (session?.email) {
    buyerEmail = session.email;
  }

  if (!buyerEmail) {
    return NextResponse.json(
      { error: "Email is required for checkout" },
      { status: 400 },
    );
  }

  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? body.idempotencyKey;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token && session) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const cookieStore = await cookies();
  const referral = parseReferralCookie(cookieStore.get(REFERRAL_COOKIE)?.value);

  const res = await fetch(`${requireApiBase()}/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dropId: body.dropId.trim(),
      buyerEmail,
      sizeLabel: body.sizeLabel.trim(),
      idempotencyKey,
      discountCode: body.discountCode?.trim(),
      referralCode: referral?.code,
    }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
