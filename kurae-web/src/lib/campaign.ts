export const CAMPAIGN_COOKIE = "kurae_utm";

export type CampaignAttribution = {
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
  sellerSlug: string;
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

function trimValue(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function parseCampaignFromSearchParams(
  params: URLSearchParams,
): Omit<CampaignAttribution, "sellerSlug"> | null {
  const source = trimValue(params.get("utm_source"));
  const medium = trimValue(params.get("utm_medium"));
  const campaign = trimValue(params.get("utm_campaign"));
  const term = trimValue(params.get("utm_term"));
  const content = trimValue(params.get("utm_content"));

  if (!source && !medium && !campaign && !term && !content) {
    return null;
  }

  return {
    source,
    medium,
    campaign,
    term: term || undefined,
    content: content || undefined,
  };
}

export function parseCampaignCookie(raw: string | undefined): CampaignAttribution | null {
  if (!raw?.trim()) return null;
  try {
    const data = JSON.parse(raw) as CampaignAttribution;
    if (!data.sellerSlug?.trim()) return null;
    if (!data.source?.trim() && !data.medium?.trim() && !data.campaign?.trim()) {
      return null;
    }
    return {
      sellerSlug: data.sellerSlug.trim(),
      source: trimValue(data.source),
      medium: trimValue(data.medium),
      campaign: trimValue(data.campaign),
      term: trimValue(data.term) || undefined,
      content: trimValue(data.content) || undefined,
    };
  } catch {
    return null;
  }
}

export function serializeCampaignCookie(data: CampaignAttribution): string {
  return JSON.stringify({
    sellerSlug: data.sellerSlug.trim(),
    source: trimValue(data.source),
    medium: trimValue(data.medium),
    campaign: trimValue(data.campaign),
    term: trimValue(data.term),
    content: trimValue(data.content),
  });
}

export function mergeCampaignAttribution(
  sellerSlug: string,
  fromUrl: Omit<CampaignAttribution, "sellerSlug"> | null,
  existing: CampaignAttribution | null,
): CampaignAttribution | null {
  if (fromUrl) {
    return {
      sellerSlug,
      ...fromUrl,
    };
  }
  if (existing && existing.sellerSlug === sellerSlug) {
    return existing;
  }
  return null;
}

export function appendCampaignParams(
  url: string,
  campaign: Pick<CampaignAttribution, "source" | "medium" | "campaign" | "term" | "content">,
): string {
  const parsed = new URL(url, "http://local");
  if (campaign.source) parsed.searchParams.set("utm_source", campaign.source);
  if (campaign.medium) parsed.searchParams.set("utm_medium", campaign.medium);
  if (campaign.campaign) parsed.searchParams.set("utm_campaign", campaign.campaign);
  if (campaign.term) parsed.searchParams.set("utm_term", campaign.term);
  if (campaign.content) parsed.searchParams.set("utm_content", campaign.content);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function campaignSearchParamKeys(): readonly string[] {
  return UTM_KEYS;
}
