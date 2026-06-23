import { NextResponse } from "next/server";

import { serializeSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { SellerSession } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const email = body.email.trim().toLowerCase();
  const session: SellerSession = {
    email,
    sellerSlug: "hana-studio",
    sellerName: "Hana Studio",
  };

  const response = NextResponse.json({ ok: true, session });
  response.cookies.set(SESSION_COOKIE, serializeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
