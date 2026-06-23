import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import type { SellerSession } from "@/lib/types";

export async function getSession(): Promise<SellerSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(decodeURIComponent(raw)) as SellerSession;
  } catch {
    return null;
  }
}

export function serializeSession(session: SellerSession): string {
  return encodeURIComponent(JSON.stringify(session));
}
