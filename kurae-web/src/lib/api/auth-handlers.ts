import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getApiBase, isApiConfigured } from "@/lib/api/config";
import {
  clearAuthCookies,
  proxyToApi,
  readToken,
  setAuthCookies,
} from "@/lib/api/proxy";
import { serializeSession } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/auth/constants";
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

  if (isApiConfigured()) {
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

  const session: SellerSession = {
    email: body.email.trim().toLowerCase(),
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

  if (isApiConfigured()) {
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

  const session: SellerSession = {
    email: body.email.trim().toLowerCase(),
    sellerSlug: slug?.trim() || "hana-studio",
    sellerName: name.trim(),
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

export async function handleLogout() {
  if (isApiConfigured()) {
    const token = await readToken();
    await proxyToApi("/auth/logout", { method: "POST" }, token);
  }
  const response = NextResponse.json({ ok: true });
  return clearAuthCookies(response);
}
