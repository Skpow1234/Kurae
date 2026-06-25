import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { parseSessionCookie } from "@/lib/auth/parse-session";
import { loginUrl } from "@/lib/auth/safe-redirect";

const DASHBOARD_PUBLIC = ["/dashboard/login", "/dashboard/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/checkout") {
    if (!session || session.role !== "buyer") {
      return NextResponse.redirect(new URL(loginUrl("/checkout"), request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (DASHBOARD_PUBLIC.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  if (!session || session.role !== "seller") {
    const login = new URL("/dashboard/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout", "/dashboard/:path*"],
};
