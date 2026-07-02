import { parseReferralCookie, REFERRAL_COOKIE, type ReferralAttribution } from "@/lib/referral";

export function readReferralCookie(): ReferralAttribution | null {
  if (typeof document === "undefined") return null;

  const prefix = `${REFERRAL_COOKIE}=`;
  const entry = document.cookie
    .split("; ")
    .find((row) => row.startsWith(prefix));

  if (!entry) return null;

  const raw = entry.slice(prefix.length);
  try {
    return parseReferralCookie(decodeURIComponent(raw));
  } catch {
    return parseReferralCookie(raw);
  }
}
