"use client";

import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CheckoutSavingsSummary } from "@/components/checkout/checkout-savings-summary";
import { Button } from "@/components/ui/button";
import type { CheckoutPricing } from "@/lib/checkout/pricing";
import { formatPrice } from "@/lib/utils";

type StripePaymentFormProps = {
  email: string;
  orderId: string;
  sellerSlug: string;
  dropSlug: string;
  sizeLabel: string;
  pricing: CheckoutPricing;
  onBack: () => void;
};

export function StripePaymentForm({
  email,
  orderId,
  sellerSlug,
  dropSlug,
  sizeLabel,
  pricing,
  onBack,
}: StripePaymentFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    setError(null);

    const returnParams = new URLSearchParams({
      order: orderId,
      seller: sellerSlug,
      drop: dropSlug,
      size: sizeLabel,
      email,
    });
    const returnUrl = `${window.location.origin}/checkout/pending?${returnParams.toString()}`;

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
        receipt_email: email,
        payment_method_data: {
          billing_details: { email },
        },
      },
      redirect: "if_required",
    });

    setPaying(false);

    if (submitError) {
      if (submitError.type === "card_error" || submitError.type === "validation_error") {
        setError(submitError.message ?? "Payment failed. Check your card details.");
      } else {
        setError(submitError.message ?? "Something went wrong. Please try again.");
      }
      return;
    }

    router.push(`/checkout/pending?${returnParams.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CheckoutSavingsSummary pricing={pricing} showSavingsBanner={false} />

      <div className="flex items-center gap-2 text-xs text-sakura-mist">
        <Lock className="h-3.5 w-3.5" />
        <span>Secured by Stripe</span>
      </div>

      <p className="text-sm text-sakura-stone">
        Paying as <span className="font-medium text-sakura-ink">{email}</span>
      </p>

      <div className="rounded-md border border-sakura-petal bg-white p-4 shadow-sm">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}

      <Button
        type="submit"
        variant="brand"
        className="w-full"
        size="lg"
        disabled={!stripe || !elements || paying}
      >
        {paying
          ? "Processing…"
          : `Pay ${formatPrice(pricing.finalCents, pricing.currency)}`}
      </Button>

      <button
        type="button"
        className="w-full text-center text-xs text-sakura-mist underline"
        onClick={onBack}
        disabled={paying}
      >
        Back
      </button>
    </form>
  );
}
