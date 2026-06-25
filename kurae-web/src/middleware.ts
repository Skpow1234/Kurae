import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { parseSessionCookie } from "@/lib/auth/parse-session";
import { authUrl, loginUrl } from "@/lib/auth/safe-redirect";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = parseSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (pathname === "/signup") {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(
      new URL(
        authUrl({
          mode: "signup",
          role: "buyer",
          next: next ?? undefined,
        }),
        request.url,
      ),
    );
  }

  if (pathname === "/checkout") {
    if (!session || session.role !== "buyer") {
      return NextResponse.redirect(new URL(loginUrl("/checkout"), request.url));
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (
    pathname === "/dashboard/login" ||
    pathname === "/dashboard/signup"
  ) {
    const next = request.nextUrl.searchParams.get("next");
    if (pathname === "/dashboard/signup") {
      return NextResponse.redirect(
        new URL(
          authUrl({
            mode: "signup",
            role: "seller",
            next: next ?? "/dashboard/drops/new",
          }),
          request.url,
        ),
      );
    }
    return NextResponse.redirect(
      new URL(
        authUrl({ role: "seller", next: next ?? "/dashboard" }),
        request.url,
      ),
    );
  }

  if (!session || session.role !== "seller") {
    return NextResponse.redirect(
      new URL(authUrl({ role: "seller", next: pathname }), request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout", "/dashboard/:path*", "/signup"],
};
