import { NextResponse } from "next/server";

import { serializeSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { slugify } from "@/lib/validation/drop";
import type { SellerSession } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    sellerName?: string;
    sellerSlug?: string;
  };

  if (!body.email?.trim() || !body.password || !body.sellerName?.trim()) {
    return NextResponse.json(
      { error: "Email, password, and brand name are required" },
      { status: 400 },
    );
  }

  const sellerSlug =
    body.sellerSlug?.trim() || slugify(body.sellerName) || "my-brand";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(sellerSlug)) {
    return NextResponse.json(
      { error: "Invalid brand URL slug" },
      { status: 400 },
    );
  }

  const session: SellerSession = {
    email: body.email.trim().toLowerCase(),
    sellerSlug,
    sellerName: body.sellerName.trim(),
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
