import type { BuyerSession, KuraeSession, SellerSession } from "@/lib/types";

export function parseSessionCookie(
  raw: string | undefined,
): KuraeSession | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    if (parsed.role === "buyer" && typeof parsed.email === "string") {
      return {
        role: "buyer",
        email: parsed.email,
        name: typeof parsed.name === "string" ? parsed.name : "",
      };
    }
    if (parsed.role === "seller" && typeof parsed.email === "string") {
      return {
        role: "seller",
        email: parsed.email,
        sellerSlug: String(parsed.sellerSlug ?? ""),
        sellerName: String(parsed.sellerName ?? ""),
      };
    }
    // Legacy seller cookies created before buyer/seller split.
    if (typeof parsed.sellerSlug === "string") {
      return {
        role: "seller",
        email: String(parsed.email ?? ""),
        sellerSlug: parsed.sellerSlug,
        sellerName: String(parsed.sellerName ?? ""),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function isSellerSession(
  session: KuraeSession | null,
): session is SellerSession {
  return session?.role === "seller";
}

export function isBuyerSession(
  session: KuraeSession | null,
): session is BuyerSession {
  return session?.role === "buyer";
}
