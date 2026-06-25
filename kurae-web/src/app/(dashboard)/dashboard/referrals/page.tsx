import { redirect } from "next/navigation";

import { ReferralDeleteButton } from "@/components/dashboard/referral-delete-button";
import { ReferralForm } from "@/components/dashboard/referral-form";
import { ReferralLinkCopy } from "@/components/dashboard/referral-link-copy";
import { listSellerDrops } from "@/lib/api/drops-server";
import { listReferralCodes } from "@/lib/api/referrals-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import type { ReferralCode } from "@/lib/types/referral";
import type { SellerDrop } from "@/lib/types";

function resolveDropSlug(
  code: ReferralCode,
  drops: SellerDrop[],
): string | null {
  if (code.dropSlug) return code.dropSlug;
  const published = drops.find((d) => d.publishStatus === "published");
  return published?.slug ?? drops[0]?.slug ?? null;
}

export default async function ReferralsPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/referrals" }));

  const [codes, drops] = await Promise.all([
    listReferralCodes(),
    listSellerDrops(),
  ]);

  const suggestedCode = session.sellerSlug.replace(/-/g, "").toUpperCase().slice(0, 32);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Referrals</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Create referral links for your drops. Clicks, signups, and paid orders are tracked
          automatically.
        </p>
      </div>

      {codes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-sakura-petal p-8 text-center text-sm text-sakura-stone">
          No referral codes yet. Create one below to get a shareable link.
        </div>
      ) : (
        <div className="space-y-6">
          {codes.map((code) => {
            const dropSlug = resolveDropSlug(code, drops);
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

                {dropSlug ? (
                  <ReferralLinkCopy
                    sellerSlug={session.sellerSlug}
                    dropSlug={dropSlug}
                    code={code.code}
                  />
                ) : (
                  <p className="text-xs text-sakura-warning">
                    Publish a drop to generate a referral link for this code.
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
