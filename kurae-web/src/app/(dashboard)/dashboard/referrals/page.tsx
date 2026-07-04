import { redirect } from "next/navigation";

import { ReferralDeleteButton } from "@/components/dashboard/referral-delete-button";
import { ReferralForm } from "@/components/dashboard/referral-form";
import { ReferralLinkCopy } from "@/components/dashboard/referral-link-copy";
import { ReferralRewardSettingsForm } from "@/components/dashboard/referral-reward-settings";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listSellerDrops } from "@/lib/api/drops-server";
import { listReferralCodes } from "@/lib/api/referrals-server";
import { fetchReferralRewardSettings } from "@/lib/api/referral-rewards-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import { resolveReferralLinkTarget } from "@/lib/referral-link";

export default async function ReferralsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/referrals" }));

  let codes;
  let drops;
  let rewardSettings;
  try {
    [codes, drops, rewardSettings] = await Promise.all([
      listReferralCodes(),
      listSellerDrops(),
      fetchReferralRewardSettings(),
    ]);
  } catch {
    return (
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">Referrals</h1>
        </div>
        <ApiLoadError message="Could not load referral codes. Check that kurae-api is running." />
      </div>
    );
  }

  const suggestedCode = session.sellerSlug.replace(/-/g, "").toUpperCase().slice(0, 32);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Referrals</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Create referral links for your drops. Clicks, signups, and paid orders are tracked
          automatically. Configure buyer rewards below.
        </p>
      </div>

      {rewardSettings && <ReferralRewardSettingsForm initial={rewardSettings} />}

      {codes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-8 text-center text-sm text-sakura-stone">
          No referral codes yet. Create one below to get a shareable link.
        </div>
      ) : (
        <div className="space-y-6">
          {codes.map((code) => {
            const linkTarget = resolveReferralLinkTarget(code, drops);
            const hasActivity =
              code.clicksCount > 0 || code.signupsCount > 0 || code.ordersCount > 0;

            return (
              <section
                key={code.id}
                className="space-y-4 rounded-lg border border-sakura-petal p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-mono text-lg font-semibold text-sakura-ink">
                      {code.code}
                    </h2>
                    <p className="text-xs text-sakura-mist">
                      {code.dropTitle ?? "All drops"}
                    </p>
                  </div>
                  <ReferralDeleteButton
                    id={code.id}
                    code={code.code}
                    hasActivity={hasActivity}
                  />
                </div>

                {linkTarget ? (
                  <ReferralLinkCopy
                    sellerSlug={session.sellerSlug}
                    code={code.code}
                    dropSlug={
                      linkTarget.kind === "drop" ? linkTarget.dropSlug : undefined
                    }
                    hint={
                      linkTarget.kind === "seller"
                        ? "Works before any drop is published — buyers land on your seller page."
                        : undefined
                    }
                  />
                ) : (
                  <p className="text-xs text-sakura-warning">
                    Drop-scoped code is missing its drop — recreate the code or restore the drop.
                  </p>
                )}

                <dl className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-md bg-sakura-surface p-3">
                    <dt className="text-xs text-sakura-mist">Clicks</dt>
                    <dd className="font-mono text-lg font-semibold">{code.clicksCount}</dd>
                  </div>
                  <div className="rounded-md bg-sakura-surface p-3">
                    <dt className="text-xs text-sakura-mist">Signups</dt>
                    <dd className="font-mono text-lg font-semibold">{code.signupsCount}</dd>
                  </div>
                  <div className="rounded-md bg-sakura-surface p-3">
                    <dt className="text-xs text-sakura-mist">Orders</dt>
                    <dd className="font-mono text-lg font-semibold">{code.ordersCount}</dd>
                  </div>
                </dl>
              </section>
            );
          })}
        </div>
      )}

      <ReferralForm
        drops={drops}
        sellerSlug={session.sellerSlug}
        suggestedCode={suggestedCode}
      />
    </div>
  );
}
