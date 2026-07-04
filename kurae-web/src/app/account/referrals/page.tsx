import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountNav } from "@/components/account/account-nav";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listBuyerReferralProgressServer } from "@/lib/api/buyer-referrals-server";
import { getBuyerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import type { BuyerReferralProgress } from "@/lib/types/referral-reward";
import { formatPrice } from "@/lib/utils";

function rewardLabel(progress: BuyerReferralProgress): string {
  if (progress.rewardType === "percent") {
    return `${progress.rewardValue}% off`;
  }
  return formatPrice(progress.rewardValue, "USD");
}

export default async function AccountReferralsPage() {
  const session = await getBuyerSession();
  if (!session) redirect(authUrl({ role: "buyer", next: "/account/referrals" }));

  let items: BuyerReferralProgress[];
  try {
    items = await listBuyerReferralProgressServer();
  } catch {
    return (
      <>
        <AccountNav active="referrals" />
        <ApiLoadError message="Could not load referral rewards. Check that kurae-api is running." />
      </>
    );
  }

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-sakura-ink">Referral rewards</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Share drops you love. Earn discount codes when friends complete paid orders.
        </p>
      </div>

      <AccountNav active="referrals" />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-8 text-center text-sm text-sakura-stone">
          No referral progress yet. Visit a live drop while signed in to get your personal
          link.
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => {
            const unusedReward = item.earnedRewards.find((reward) => !reward.redeemed);
            return (
              <li
                key={item.sellerSlug}
                className="rounded-lg border border-sakura-petal bg-sakura-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sakura-ink">{item.sellerName}</p>
                    <p className="mt-0.5 font-mono text-xs text-sakura-mist">
                      Code {item.code}
                    </p>
                  </div>
                  {!item.rewardsEnabled && (
                    <span className="text-xs text-sakura-mist">Rewards paused</span>
                  )}
                </div>

                {item.rewardsEnabled && (
                  <>
                    <p className="mt-3 text-sm text-sakura-stone">
                      {item.successfulReferrals} successful referral
                      {item.successfulReferrals === 1 ? "" : "s"} ·{" "}
                      {item.referralsUntilReward} until next {rewardLabel(item)}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-sakura-petal/70">
                      <div
                        className="brand-accent-fill h-full rounded-full"
                        style={{
                          width: `${Math.round((item.progressInTier / item.threshold) * 100)}%`,
                        }}
                      />
                    </div>
                  </>
                )}

                {unusedReward && (
                  <p className="mt-3 text-sm">
                    Reward code:{" "}
                    <span className="font-mono font-semibold text-sakura-ink">
                      {unusedReward.code}
                    </span>
                  </p>
                )}

                <Link
                  href={`/${item.sellerSlug}`}
                  className="mt-4 inline-block text-sm text-sakura-dusk hover:underline"
                >
                  Browse {item.sellerName} drops →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
