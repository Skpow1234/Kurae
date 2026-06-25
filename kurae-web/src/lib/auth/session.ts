import { cookies } from "next/headers";
import { cache } from "react";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import {
  isBuyerSession,
  isSellerSession,
  parseSessionCookie,
} from "@/lib/auth/parse-session";
import type {
  BuyerSession,
  KuraeSession,
  SellerSession,
} from "@/lib/types";

export const getSession = cache(async (): Promise<KuraeSession | null> => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  return parseSessionCookie(raw);
});

export const getSellerSession = cache(async (): Promise<SellerSession | null> => {
  const session = await getSession();
  return isSellerSession(session) ? session : null;
});

export const getBuyerSession = cache(async (): Promise<BuyerSession | null> => {
  const session = await getSession();
  return isBuyerSession(session) ? session : null;
});

export function serializeSession(session: KuraeSession): string {
  return encodeURIComponent(JSON.stringify(session));
}
