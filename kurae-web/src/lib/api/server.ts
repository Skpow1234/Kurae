import { cookies } from "next/headers";

import { TOKEN_COOKIE } from "@/lib/auth/constants";
import { requireApiBase } from "@/lib/api/config";
import { ApiError } from "@/lib/api/client";

const PUBLIC_REVALIDATE_SECONDS = 15;

async function parseJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new ApiError(await res.text(), res.status);
  }
  return res.json() as Promise<T>;
}

export async function apiServerFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = requireApiBase();

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;

  const res = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  return parseJsonResponse<T>(res);
}

/** Cached public reads — safe for drop pages and browse feed. */
export async function apiPublicFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = requireApiBase();

  const res = await fetch(`${base}${path}`, {
    ...init,
    next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  return parseJsonResponse<T>(res);
}

export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_COOKIE)?.value;
}
