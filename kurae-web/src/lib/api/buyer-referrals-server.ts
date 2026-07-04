import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getBuyerSession } from "@/lib/auth/session";
import type { BuyerReferralProgress } from "@/lib/types/referral-reward";

export async function listBuyerReferralProgressServer(): Promise<BuyerReferralProgress[]> {
  const session = await getBuyerSession();
  if (!session) return [];

  const token = await readToken();
  const res = await fetch(`${requireApiBase()}/buyer/referrals`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Could not load referral progress");
  }
  const data = (await res.json()) as { items?: BuyerReferralProgress[] };
  return data.items ?? [];
}

export async function fetchBuyerReferralProgressServer(
  sellerSlug: string,
): Promise<BuyerReferralProgress | null> {
  const session = await getBuyerSession();
  if (!session) return null;

  const token = await readToken();
  const params = new URLSearchParams({ sellerSlug });
  const res = await fetch(`${requireApiBase()}/buyer/referrals?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { progress?: BuyerReferralProgress };
  return data.progress ?? null;
}
