import { NextResponse } from "next/server";

import { getApiBase } from "@/lib/api/config";
import { SESSION_COOKIE, TOKEN_COOKIE } from "@/lib/auth/constants";
import { serializeSession } from "@/lib/auth/session";
import type { SellerSession } from "@/lib/types";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

type AuthPayload = {
  ok: boolean;
  session: SellerSession;
  token: string;
};

export async function proxyToApi(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<Response> {
  const base = getApiBase();
  if (!base) {
    return NextResponse.json({ error: "API not configured" }, { status: 503 });
  }

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${base}${path}`, { ...init, headers });
}

export function setAuthCookies(
  response: NextResponse,
  payload: AuthPayload,
): NextResponse {
  response.cookies.set(SESSION_COOKIE, serializeSession(payload.session), COOKIE_OPTS);
  response.cookies.set(TOKEN_COOKIE, payload.token, COOKIE_OPTS);
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set(TOKEN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return response;
}

export async function readToken(): Promise<string | undefined> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value;
}
