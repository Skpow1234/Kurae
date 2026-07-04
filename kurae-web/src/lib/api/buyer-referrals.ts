import type { BuyerReferralProgress } from "@/lib/types/referral-reward";

export async function fetchBuyerReferralProgress(
  sellerSlug: string,
): Promise<BuyerReferralProgress | null> {
  const params = new URLSearchParams({ sellerSlug });
  const res = await fetch(`/api/buyer/referrals?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { progress?: BuyerReferralProgress };
  return data.progress ?? null;
}

export async function listBuyerReferralProgress(): Promise<BuyerReferralProgress[]> {
  const res = await fetch("/api/buyer/referrals", { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: BuyerReferralProgress[] };
  return data.items ?? [];
}
