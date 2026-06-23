export type CheckoutFailureReason =
  | "sold_out"
  | "not_found"
  | "reservation_failed"
  | "stripe_not_configured"
  | "payment_failed"
  | "cancelled"
  | "refunded"
  | "timeout";

export type CheckoutFailureContext = {
  reason: CheckoutFailureReason;
  seller?: string;
  drop?: string;
  size?: string;
  order?: string;
  message?: string;
};

export type CheckoutFailureContent = {
  eyebrow: string;
  title: string;
  description: string;
  reserved: boolean;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

const DEFAULT_REASON: CheckoutFailureReason = "payment_failed";

export function normalizeFailureReason(
  raw: string | null | undefined,
): CheckoutFailureReason {
  if (!raw) return DEFAULT_REASON;

  const value = raw.toLowerCase().replace(/-/g, "_");

  switch (value) {
    case "sold_out":
      return "sold_out";
    case "not_found":
      return "not_found";
    case "reservation_failed":
      return "reservation_failed";
    case "stripe_not_configured":
      return "stripe_not_configured";
    case "payment_failed":
    case "payment_pending":
      return "payment_failed";
    case "cancelled":
      return "cancelled";
    case "refunded":
      return "refunded";
    case "timeout":
      return "timeout";
    default:
      return DEFAULT_REASON;
  }
}

export function buildCheckoutFailedUrl(ctx: CheckoutFailureContext): string {
  const params = new URLSearchParams({ reason: ctx.reason });
  if (ctx.seller) params.set("seller", ctx.seller);
  if (ctx.drop) params.set("drop", ctx.drop);
  if (ctx.size) params.set("size", ctx.size);
  if (ctx.order) params.set("order", ctx.order);
  if (ctx.message) params.set("message", ctx.message);
  return `/checkout/failed?${params.toString()}`;
}

function dropHref(seller?: string, drop?: string): string {
  if (seller && drop) return `/${seller}/${drop}#purchase`;
  return "/";
}

export function getCheckoutFailureContent(
  ctx: CheckoutFailureContext,
): CheckoutFailureContent {
  const dropLink = dropHref(ctx.seller, ctx.drop);
  const checkoutLink = "/checkout";

  switch (ctx.reason) {
    case "sold_out":
      return {
        eyebrow: "Sold out",
        title: "This drop just sold out",
        description:
          "Someone grabbed the last unit while you were checking out. Join the waitlist on the drop page for the next release.",
        reserved: false,
        primaryLabel: "Back to drop",
        primaryHref: dropLink,
        secondaryLabel: "Browse other drops",
        secondaryHref: "/",
      };

    case "not_found":
      return {
        eyebrow: "Unavailable",
        title: "Drop not found",
        description:
          "This drop may have been removed or the link is invalid.",
        reserved: false,
        primaryLabel: "Browse drops",
        primaryHref: "/",
        secondaryLabel: "Back to checkout",
        secondaryHref: checkoutLink,
      };

    case "stripe_not_configured":
      return {
        eyebrow: "Payments unavailable",
        title: "Card payments are not enabled",
        description:
          ctx.message ??
          "Stripe is not configured for this environment. Set STRIPE_SECRET_KEY on kurae-api and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in kurae-web.",
        reserved: false,
        primaryLabel: "Back to drop",
        primaryHref: dropLink,
        secondaryLabel: "Back to checkout",
        secondaryHref: checkoutLink,
      };

    case "cancelled":
      return {
        eyebrow: "Order cancelled",
        title: "This order was cancelled",
        description:
          "No charge was completed. You can try checkout again if units are still available.",
        reserved: false,
        primaryLabel: "Try checkout again",
        primaryHref: checkoutLink,
        secondaryLabel: "Back to drop",
        secondaryHref: dropLink,
      };

    case "refunded":
      return {
        eyebrow: "Refunded",
        title: "This payment was refunded",
        description:
          "The charge was reversed. Contact the seller if you have questions about this order.",
        reserved: false,
        primaryLabel: "Back to drop",
        primaryHref: dropLink,
        secondaryLabel: "Browse drops",
        secondaryHref: "/",
      };

    case "timeout":
      return {
        eyebrow: "Still processing",
        title: "Payment confirmation timed out",
        description:
          "We could not confirm your payment in time. If you were charged, you will receive a confirmation email shortly. Otherwise you can try again.",
        reserved: true,
        primaryLabel: "Try checkout again",
        primaryHref: checkoutLink,
        secondaryLabel: "Back to drop",
        secondaryHref: dropLink,
      };

    case "reservation_failed":
      return {
        eyebrow: "Checkout error",
        title: "Could not reserve your unit",
        description:
          ctx.message ??
          "Something went wrong while reserving inventory. Please try again.",
        reserved: false,
        primaryLabel: "Try again",
        primaryHref: checkoutLink,
        secondaryLabel: "Back to drop",
        secondaryHref: dropLink,
      };

    case "payment_failed":
    default:
      return {
        eyebrow: "Payment failed",
        title: "Could not complete payment",
        description:
          ctx.message ??
          (ctx.order
            ? "Your card was declined or the payment could not be processed. Your reservation may expire soon — try again quickly."
            : "Your card was declined or the session expired. Your unit has not been reserved."),
        reserved: Boolean(ctx.order),
        primaryLabel: "Try again",
        primaryHref: checkoutLink,
        secondaryLabel: "Back to drop",
        secondaryHref: dropLink,
      };
  }
}

export function checkoutFailureFromHttpStatus(
  status: number,
): CheckoutFailureReason {
  if (status === 409) return "sold_out";
  if (status === 404) return "not_found";
  return "reservation_failed";
}
