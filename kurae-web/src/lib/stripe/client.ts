import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePublishableKey(): string {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  if (!key) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required for checkout.",
    );
  }
  return key;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim());
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(getStripePublishableKey());
  }
  return stripePromise;
}

export function isDevPaymentIntent(clientSecret: string): boolean {
  return clientSecret.includes("_dev_") || clientSecret.startsWith("pi_dev_");
}
