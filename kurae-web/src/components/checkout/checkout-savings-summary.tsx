import type { CheckoutPricing } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type CheckoutSavingsSummaryProps = {
  pricing: CheckoutPricing;
  showSavingsBanner?: boolean;
  className?: string;
};

export function CheckoutSavingsSummary({
  pricing,
  showSavingsBanner = true,
  className,
}: CheckoutSavingsSummaryProps) {
  const hasDiscount = pricing.discountCents > 0;
  const hasReferral = Boolean(pricing.referralCode?.trim());

  return (
    <div className={cn("space-y-3", className)}>
      {showSavingsBanner && hasDiscount && (
        <div
          className="rounded-md border border-sakura-success/30 bg-sakura-success/10 px-3 py-2 text-sm font-medium text-sakura-success"
          role="status"
        >
          You save {formatPrice(pricing.discountCents, pricing.currency)}
          {pricing.discountCode ? (
            <>
              {" "}
              with{" "}
              <span className="font-mono">{pricing.discountCode}</span>
            </>
          ) : null}
        </div>
      )}

      {hasReferral && (
        <div
          className="rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-xs text-sakura-stone"
          role="status"
        >
          Referral{" "}
          <span className="font-mono font-semibold text-sakura-ink">
            {pricing.referralCode}
          </span>{" "}
          {pricing.referralPending
            ? "will be linked when you reserve your unit"
            : "linked to this order"}
        </div>
      )}

      <dl className="space-y-2 text-sm">
        {hasDiscount && (
          <>
            <div className="flex items-baseline justify-between gap-4 text-sakura-mist">
              <dt>Subtotal</dt>
              <dd className="font-mono line-through tabular-nums">
                {formatPrice(pricing.subtotalCents, pricing.currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-sakura-success">
              <dt>
                Discount
                {pricing.discountCode ? (
                  <span className="ml-1 font-mono text-xs">({pricing.discountCode})</span>
                ) : null}
              </dt>
              <dd className="font-mono tabular-nums">
                −{formatPrice(pricing.discountCents, pricing.currency)}
              </dd>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-sakura-petal pt-2">
          <dt className="font-medium text-sakura-ink">Total</dt>
          <dd className="brand-accent-text font-mono text-lg font-semibold tabular-nums">
            {formatPrice(pricing.finalCents, pricing.currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
