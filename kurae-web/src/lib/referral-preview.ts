import { requireApiBase } from "@/lib/api/config";
import { getSiteUrl } from "@/lib/site-url";

export type ReferralPreview = {
  valid: boolean;
  code?: string;
  referrerLabel?: string;
  sellerName?: string;
  sellerSlug?: string;
  dropTitle?: string;
  dropSlug?: string;
  description?: string;
  heroImageUrl?: string;
  logoUrl?: string;
  accent?: string;
};

type PreviewQuery = {
  sellerSlug?: string;
  dropSlug?: string;
  dropId?: string;
  code: string;
};

function buildPreviewQuery(params: PreviewQuery): URLSearchParams | null {
  const code = params.code.trim();
  if (!code) return null;

  const qs = new URLSearchParams({ code: code.toUpperCase() });
  if (params.sellerSlug?.trim()) {
    qs.set("sellerSlug", params.sellerSlug.trim());
    if (params.dropSlug?.trim()) {
      qs.set("dropSlug", params.dropSlug.trim());
    }
  } else if (params.dropId?.trim()) {
    qs.set("dropId", params.dropId.trim());
  } else {
    return null;
  }

  return qs;
}

export async function fetchReferralPreviewServer(
  params: PreviewQuery,
): Promise<ReferralPreview | null> {
  const qs = buildPreviewQuery(params);
  if (!qs) return null;

  try {
    const res = await fetch(
      `${requireApiBase()}/public/referrals/preview?${qs}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as ReferralPreview;
    return data.valid ? data : null;
  } catch {
    return null;
  }
}

export async function fetchReferralPreviewClient(
  params: PreviewQuery,
): Promise<ReferralPreview | null> {
  const qs = buildPreviewQuery(params);
  if (!qs) return null;

  try {
    const res = await fetch(`/api/referrals/preview?${qs}`, { cache: "no-store" });
    if (!res.ok) return null;

    const data = (await res.json()) as ReferralPreview;
    return data.valid ? data : null;
  } catch {
    return null;
  }
}

export function buildReferralOgImagePath(params: {
  sellerSlug: string;
  dropSlug?: string;
  code: string;
}): string {
  const qs = new URLSearchParams({
    seller: params.sellerSlug,
    code: params.code.trim().toUpperCase(),
  });
  if (params.dropSlug?.trim()) {
    qs.set("drop", params.dropSlug.trim());
  }
  return `/api/og/referral?${qs}`;
}

export function buildReferralOgImageUrl(params: {
  sellerSlug: string;
  dropSlug?: string;
  code: string;
}): string {
  const siteUrl = getSiteUrl();
  const path = buildReferralOgImagePath(params);
  return siteUrl ? `${siteUrl}${path}` : path;
}

export function buildReferralPageTitle(preview: ReferralPreview): string {
  const referrer = preview.referrerLabel?.trim() || "A friend";
  if (preview.dropTitle?.trim()) {
    return `${referrer} invited you · ${preview.dropTitle.trim()}`;
  }
  if (preview.sellerName?.trim()) {
    return `${referrer} invited you · ${preview.sellerName.trim()}`;
  }
  return `${referrer} invited you`;
}

export function buildReferralPageDescription(preview: ReferralPreview): string {
  const trimmed = preview.description?.trim();
  if (trimmed) return trimmed;

  const seller = preview.sellerName?.trim() || "this seller";
  if (preview.dropTitle?.trim()) {
    return `Shop ${preview.dropTitle.trim()} — a limited drop from ${seller} on Kurae.`;
  }
  return `Shop limited drops from ${seller} on Kurae.`;
}

export function buildReferralShareUrl(params: {
  sellerSlug: string;
  dropSlug?: string;
  code: string;
}): string {
  const siteUrl = getSiteUrl() || "http://localhost:3000";
  const base = siteUrl.replace(/\/$/, "");
  const code = encodeURIComponent(params.code.trim().toUpperCase());
  if (params.dropSlug?.trim()) {
    return `${base}/${params.sellerSlug}/${params.dropSlug.trim()}?ref=${code}`;
  }
  return `${base}/${params.sellerSlug}?ref=${code}`;
}
