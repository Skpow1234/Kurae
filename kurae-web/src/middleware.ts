import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { loginUrl } from "@/lib/auth/safe-redirect";

const DASHBOARD_PUBLIC = ["/dashboard/login", "/dashboard/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE);

  if (pathname === "/checkout" && !session?.value) {
    return NextResponse.redirect(new URL(loginUrl("/checkout"), request.url));
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (DASHBOARD_PUBLIC.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  if (!session?.value) {
    const login = new URL("/dashboard/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout", "/dashboard/:path*"],
};
