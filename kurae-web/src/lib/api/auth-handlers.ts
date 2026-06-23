import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  clearAuthCookies,
  proxyToApi,
  readToken,
  setAuthCookies,
} from "@/lib/api/proxy";
import type { SellerSession } from "@/lib/types";

type AuthPayload = { ok: boolean; session: SellerSession; token: string };

export async function handleLogin(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const res = await proxyToApi("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
    }),
  });
  const data = (await res.json()) as AuthPayload | { error?: string };
  if (!res.ok) {
    const err = data as { error?: string };
    return NextResponse.json(
      { error: err.error ?? "Sign in failed" },
      { status: res.status },
    );
  }
  const auth = data as AuthPayload;
  const response = NextResponse.json({ ok: true, session: auth.session });
  return setAuthCookies(response, auth);
}

export async function handleSignup(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    sellerName?: string;
    sellerSlug?: string;
    name?: string;
    slug?: string;
  };

  const name = body.sellerName ?? body.name;
  const slug = body.sellerSlug ?? body.slug;

  if (!body.email?.trim() || !body.password || !name?.trim()) {
    return NextResponse.json(
      { error: "Email, password, and brand name are required" },
      { status: 400 },
    );
  }

  const res = await proxyToApi("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      name: name.trim(),
      slug: slug?.trim(),
    }),
  });
  const data = (await res.json()) as AuthPayload | { error?: string };
  if (!res.ok) {
    const err = data as { error?: string };
    return NextResponse.json(
      { error: err.error ?? "Sign up failed" },
      { status: res.status },
    );
  }
  const auth = data as AuthPayload;
  const response = NextResponse.json({ ok: true, session: auth.session });
  return setAuthCookies(response, auth);
}

export async function handleLogout() {
  const token = await readToken();
  await proxyToApi("/auth/logout", { method: "POST" }, token);
  const response = NextResponse.json({ ok: true });
  return clearAuthCookies(response);
}
