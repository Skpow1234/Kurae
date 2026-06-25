"use client";

import { Elements } from "@stripe/react-stripe-js";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StripePaymentForm } from "@/components/checkout/stripe-payment-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { ApiError } from "@/lib/api/client";
import { loginUrl } from "@/lib/auth/safe-redirect";
import { createCheckout } from "@/lib/api/checkout";
import { validateDiscountCode } from "@/lib/api/discount";
import {
  buildCheckoutFailedUrl,
  checkoutFailureFromHttpStatus,
} from "@/lib/checkout-failure";
import {
  getStripe,
  isDevPaymentIntent,
  isStripeConfigured,
} from "@/lib/stripe/client";
import type { PublicDrop } from "@/lib/types";
import type { DiscountPreview } from "@/lib/types/discount";
import { formatPrice } from "@/lib/utils";

type CheckoutSession = {
  orderId: string;
  clientSecret: string;
};

function CheckoutContent() {
  const { line } = useCart();

  if (!line) {
    return (
      <div className="text-center">
        <p className="text-sakura-stone">Your cart is empty.</p>
        <NextLink
          href="/"
          className="mt-4 inline-block text-sm text-sakura-dusk hover:underline"
        >
          Browse drops
        </NextLink>
      </div>
    );
  }

  return <CheckoutWithLine line={line} />;
}

function CheckoutWithLine({
  line,
}: {
  line: NonNullable<ReturnType<typeof useCart>["line"]>;
}) {
  const router = useRouter();
  const [drop, setDrop] = useState<PublicDrop | null>(null);
  const [loadingDrop, setLoadingDrop] = useState(true);
  const [email, setEmail] = useState("");
  const [loadingBuyer, setLoadingBuyer] = useState(true);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(
    null,
  );
  const [validatingCode, setValidatingCode] = useState(false);

  useEffect(() => {
    fetch("/api/auth/buyer/me")
      .then((res) => {
        if (!res.ok) {
          router.replace(loginUrl("/checkout"));
          return null;
        }
        return res.json() as Promise<{ session?: { email?: string } }>;
      })
      .then((data) => {
        if (data?.session?.email) {
          setEmail(data.session.email);
        }
      })
      .catch(() => router.replace(loginUrl("/checkout")))
      .finally(() => setLoadingBuyer(false));
  }, [router]);

  useEffect(() => {
    fetch(`/api/public/${line.sellerSlug}/${line.dropSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setDrop(data?.drop ?? null);
        setLoadingDrop(false);
      })
      .catch(() => setLoadingDrop(false));
  }, [line.dropSlug, line.sellerSlug]);

  if (loadingDrop || loadingBuyer) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!drop || drop.status !== "live") {
    return (
      <div className="text-center">
        <p className="text-sakura-stone">This drop isn&apos;t available for checkout.</p>
        <NextLink
          href={`/${line.sellerSlug}/${line.dropSlug}`}
          className="mt-4 inline-block text-sm text-sakura-dusk hover:underline"
        >
          Back to drop
        </NextLink>
      </div>
    );
  }

  if (!isStripeConfigured()) {
    return (
      <div className="rounded-lg border border-sakura-petal bg-sakura-surface p-6 text-center">
        <p className="text-sm text-sakura-stone">
          Stripe is not configured. Set{" "}
          <code className="text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> in{" "}
          <code className="text-xs">.env.local</code> and{" "}
          <code className="text-xs">STRIPE_SECRET_KEY</code> on kurae-api.
        </p>
      </div>
    );
  }

  async function handleApplyCode() {
    if (!drop || !discountInput.trim()) return;
    setValidatingCode(true);
    setError(null);
    try {
      const preview = await validateDiscountCode({
        dropId: drop.id,
        code: discountInput.trim(),
      });
      if (!preview.valid) {
        setAppliedCode(null);
        setDiscountPreview(null);
        setError(preview.message ?? "Invalid or expired code.");
        return;
      }
      setAppliedCode(preview.code ?? discountInput.trim().toUpperCase());
      setDiscountPreview(preview);
    } catch {
      setError("Could not validate code.");
      setAppliedCode(null);
      setDiscountPreview(null);
    } finally {
      setValidatingCode(false);
    }
  }

  function handleClearCode() {
    setDiscountInput("");
    setAppliedCode(null);
    setDiscountPreview(null);
    setError(null);
  }

  async function handleReserve() {
    if (!email.trim() || !drop) return;
    setReserving(true);
    setError(null);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `checkout-${Date.now()}`;

      const result = await createCheckout({
        dropId: drop.id,
        sizeLabel: line!.sizeLabel,
        idempotencyKey,
        discountCode: appliedCode ?? undefined,
      });

      if (isDevPaymentIntent(result.clientSecret)) {
        router.push(
          buildCheckoutFailedUrl({
            reason: "stripe_not_configured",
            seller: line!.sellerSlug,
            drop: line!.dropSlug,
            size: line!.sizeLabel,
          }),
        );
        return;
      }

      setSession({
        orderId: result.orderId,
        clientSecret: result.clientSecret,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400 && appliedCode) {
          setError("Invalid or expired discount code.");
          return;
        }
        router.push(
          buildCheckoutFailedUrl({
            reason: checkoutFailureFromHttpStatus(err.status),
            seller: line!.sellerSlug,
            drop: line!.dropSlug,
            size: line!.sizeLabel,
            message:
              err.status >= 500 ? "Checkout is temporarily unavailable." : undefined,
          }),
        );
        return;
      }
      setError("Could not reserve inventory. The drop may have sold out.");
    } finally {
      setReserving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
        <h1 className="font-semibold text-sakura-ink">{line.dropTitle}</h1>
        <p className="mt-1 text-sm text-sakura-mist">Size {line.sizeLabel}</p>
        <p className="mt-3 font-mono text-lg font-semibold text-sakura-dusk">
          {discountPreview?.valid
            ? formatPrice(discountPreview.finalCents, line.currency)
            : formatPrice(line.priceCents, line.currency)}
        </p>
        {discountPreview?.valid && discountPreview.discountCents > 0 && (
          <p className="mt-1 text-xs text-sakura-mist">
            {formatPrice(discountPreview.subtotalCents, line.currency)} −{" "}
            {formatPrice(discountPreview.discountCents, line.currency)} (
            {appliedCode})
          </p>
        )}
      </section>

      <p className="text-sm font-medium text-sakura-warning">
        Limited units — complete checkout to secure yours.{" "}
        <span className="font-mono text-sakura-dusk">
          {drop.inventoryRemaining} left
        </span>
      </p>

      {session ? (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret: session.clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#c97b8a",
                colorBackground: "#ffffff",
                colorText: "#2d2428",
                borderRadius: "6px",
              },
            },
          }}
        >
          <StripePaymentForm
            email={email.trim()}
            orderId={session.orderId}
            sellerSlug={line.sellerSlug}
            dropSlug={line.dropSlug}
            sizeLabel={line.sizeLabel}
            onBack={() => setSession(null)}
          />
        </Elements>
      ) : (
        <>
          <div>
            <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <Input
              id="checkout-email"
              type="email"
              required
              readOnly
              value={email}
              disabled={reserving}
              className="bg-sakura-surface text-sakura-stone"
            />
            <p className="mt-1 text-xs text-sakura-mist">
              Receipt and order updates go to your account email.
            </p>
          </div>

          <div>
            <label htmlFor="checkout-discount" className="mb-1 block text-sm font-medium">
              Discount code
            </label>
            <div className="flex gap-2">
              <Input
                id="checkout-discount"
                placeholder="SAKURA10"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                disabled={reserving || validatingCode || !!appliedCode}
              />
              {appliedCode ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={reserving}
                  onClick={handleClearCode}
                >
                  Remove
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={reserving || validatingCode || !discountInput.trim()}
                  onClick={() => void handleApplyCode()}
                >
                  {validatingCode ? "Checking…" : "Apply"}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-sakura-warning" role="alert">
              {error}
            </p>
          )}

          <Button
            className="w-full bg-sakura-blush text-sakura-ink hover:bg-sakura-bloom"
            size="lg"
            disabled={reserving || !email.trim()}
            onClick={handleReserve}
          >
            {reserving ? "Reserving your unit…" : "Continue to payment"}
          </Button>
        </>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-sakura-paper">
      <header className="border-b border-sakura-petal px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <NextLink href="/" className="text-sm text-sakura-mist hover:text-sakura-dusk">
            ← Back
          </NextLink>
          <p className="text-sm font-medium text-sakura-ink">Checkout</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-8">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
