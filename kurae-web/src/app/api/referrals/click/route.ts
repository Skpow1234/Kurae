import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { REFERRAL_COOKIE, serializeReferralCookie } from "@/lib/referral";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    dropId?: string;
    code?: string;
    sellerSlug?: string;
  };

  if (!body.dropId?.trim() || !body.code?.trim() || !body.sellerSlug?.trim()) {
    return NextResponse.json(
      { error: "dropId, code, and sellerSlug are required" },
      { status: 400 },
    );
  }

  const code = body.code.trim().toUpperCase();
  const sellerSlug = body.sellerSlug.trim();

  const res = await fetch(`${requireApiBase()}/public/referrals/click`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dropId: body.dropId.trim(), code }),
  });

  const response = NextResponse.json(
    res.ok ? { ok: true } : await res.json(),
    { status: res.status },
  );

  if (res.ok) {
    response.cookies.set(
      REFERRAL_COOKIE,
      serializeReferralCookie({ code, sellerSlug }),
      COOKIE_OPTS,
    );
  }

  return response;
}
