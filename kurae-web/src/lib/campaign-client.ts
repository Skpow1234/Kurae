import {
  CAMPAIGN_COOKIE,
  parseCampaignCookie,
  serializeCampaignCookie,
  type CampaignAttribution,
} from "@/lib/campaign";

export function readCampaignCookie(): CampaignAttribution | null {
  if (typeof document === "undefined") return null;

  const prefix = `${CAMPAIGN_COOKIE}=`;
  const raw = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);

  if (!raw) return null;

  try {
    return parseCampaignCookie(decodeURIComponent(raw));
  } catch {
    return parseCampaignCookie(raw);
  }
}

export function writeCampaignCookie(data: CampaignAttribution): void {
  if (typeof document === "undefined") return;

  const value = encodeURIComponent(serializeCampaignCookie(data));
  document.cookie = `${CAMPAIGN_COOKIE}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}
