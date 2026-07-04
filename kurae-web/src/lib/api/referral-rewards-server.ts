import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";
import { getSellerSession } from "@/lib/auth/session";
import type { ReferralRewardSettings } from "@/lib/types/referral-reward";

export async function fetchReferralRewardSettings(): Promise<ReferralRewardSettings | null> {
  const session = await getSellerSession();
  if (!session) return null;

  const token = await readToken();
  const res = await fetch(`${requireApiBase()}/referral-rewards/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { settings?: ReferralRewardSettings };
  return data.settings ?? null;
}
