import { apiServerFetch } from "@/lib/api/server";
import type { ReferralCode } from "@/lib/types/referral";

export async function listReferralCodes(): Promise<ReferralCode[]> {
  try {
    const data = await apiServerFetch<{ referralCodes: ReferralCode[] }>(
      "/referral-codes",
    );
    return data.referralCodes ?? [];
  } catch {
    return [];
  }
}
