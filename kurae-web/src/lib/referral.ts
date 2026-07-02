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

export function buildSellerReferralLink(
  origin: string,
  sellerSlug: string,
  code: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/${sellerSlug}?ref=${encodeURIComponent(code)}`;
}

export function buildReferralLinkForCode(
  origin: string,
  sellerSlug: string,
  code: string,
  dropSlug?: string,
): string {
  if (dropSlug?.trim()) {
    return buildReferralLink(origin, sellerSlug, dropSlug.trim(), code);
  }
  return buildSellerReferralLink(origin, sellerSlug, code);
}
