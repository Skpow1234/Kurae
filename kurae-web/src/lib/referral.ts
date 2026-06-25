export const REFERRAL_COOKIE = "kurae_ref";

export type ReferralAttribution = {
  code: string;
  sellerSlug: string;
};

export function parseReferralCookie(raw: string | undefined): ReferralAttribution | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as ReferralAttribution;
    if (!data.code?.trim() || !data.sellerSlug?.trim()) return null;
    return {
      code: data.code.trim().toUpperCase(),
      sellerSlug: data.sellerSlug.trim(),
    };
  } catch {
    return null;
  }
}

export function serializeReferralCookie(data: ReferralAttribution): string {
  return JSON.stringify({
    code: data.code.trim().toUpperCase(),
    sellerSlug: data.sellerSlug.trim(),
  });
}

export function buildReferralLink(
  origin: string,
  sellerSlug: string,
  dropSlug: string,
  code: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/${sellerSlug}/${dropSlug}?ref=${encodeURIComponent(code)}`;
}
