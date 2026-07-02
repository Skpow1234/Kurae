export type CheckoutPricing = {
  currency: string;
  subtotalCents: number;
  discountCents: number;
  finalCents: number;
  discountCode?: string | null;
  referralCode?: string | null;
  /** Referral read from cookie before order is reserved. */
  referralPending?: boolean;
};

export function buildCheckoutPricing(input: {
  currency: string;
  subtotalCents: number;
  discountCents?: number;
  finalCents?: number;
  discountCode?: string | null;
  referralCode?: string | null;
  referralPending?: boolean;
}): CheckoutPricing {
  const discountCents = Math.max(0, input.discountCents ?? 0);
  const subtotalCents = input.subtotalCents;
  const finalCents =
    input.finalCents ?? Math.max(0, subtotalCents - discountCents);

  return {
    currency: input.currency,
    subtotalCents,
    discountCents,
    finalCents,
    discountCode: input.discountCode ?? null,
    referralCode: input.referralCode ?? null,
    referralPending: input.referralPending,
  };
}
