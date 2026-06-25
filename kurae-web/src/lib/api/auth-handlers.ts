import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  clearAuthCookies,
  proxyToApi,
  readToken,
  setAuthCookies,
} from "@/lib/api/proxy";
import type { KuraeSession } from "@/lib/types";

type AuthPayload = { ok: boolean; session: KuraeSession; token: string };

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

export async function handleBuyerLogin(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const res = await proxyToApi("/auth/buyer/login", {
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

export async function handleBuyerSignup(request: NextRequest) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!body.email?.trim() || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  const res = await proxyToApi("/auth/buyer/register", {
    method: "POST",
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      name: body.name?.trim() ?? "",
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

export async function handleUpdateProfile(request: NextRequest) {
  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }

  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await proxyToApi(
    "/auth/profile",
    {
      method: "PATCH",
      body: JSON.stringify({ name: body.name.trim() }),
    },
    token,
  );
  const data = (await res.json()) as AuthPayload | { error?: string };
  if (!res.ok) {
    const err = data as { error?: string };
    return NextResponse.json(
      { error: err.error ?? "Could not update profile" },
      { status: res.status },
    );
  }

  const auth = data as AuthPayload;
  const response = NextResponse.json({ ok: true, session: auth.session });
  return setAuthCookies(response, auth);
}

export async function handleChangePassword(request: NextRequest) {
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }

  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await proxyToApi(
    "/auth/password",
    {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      }),
    },
    token,
  );
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Could not change password" },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function handleBuyerUpdateProfile(request: NextRequest) {
  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await proxyToApi(
    "/auth/buyer/profile",
    {
      method: "PATCH",
      body: JSON.stringify({ name: body.name.trim() }),
    },
    token,
  );
  const data = (await res.json()) as AuthPayload | { error?: string };
  if (!res.ok) {
    const err = data as { error?: string };
    return NextResponse.json(
      { error: err.error ?? "Could not update profile" },
      { status: res.status },
    );
  }

  const auth = data as AuthPayload;
  const response = NextResponse.json({ ok: true, session: auth.session });
  return setAuthCookies(response, auth);
}

export async function handleBuyerChangePassword(request: NextRequest) {
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: "Current and new password are required" },
      { status: 400 },
    );
  }

  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await proxyToApi(
    "/auth/buyer/password",
    {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      }),
    },
    token,
  );
  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    return NextResponse.json(
      { error: data.error ?? "Could not change password" },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}
