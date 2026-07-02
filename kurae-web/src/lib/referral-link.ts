import type { ReferralCode } from "@/lib/types/referral";
import type { SellerDrop } from "@/lib/types";

export type ReferralLinkTarget =
  | { kind: "drop"; dropSlug: string }
  | { kind: "seller" };

export function resolveReferralLinkTarget(
  code: ReferralCode,
  drops: SellerDrop[],
): ReferralLinkTarget | null {
  if (code.dropId || code.dropSlug) {
    const dropSlug =
      code.dropSlug ?? drops.find((drop) => drop.id === code.dropId)?.slug;
    return dropSlug ? { kind: "drop", dropSlug } : null;
  }

  return { kind: "seller" };
}
