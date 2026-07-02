"use client";

import { Elements } from "@stripe/react-stripe-js";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { CartLinesPanel } from "@/components/cart/cart-lines-panel";
import { CheckoutSavingsSummary } from "@/components/checkout/checkout-savings-summary";
import { StripePaymentForm } from "@/components/checkout/stripe-payment-form";
import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { ApiError } from "@/lib/api/client";
import { authUrl } from "@/lib/auth/safe-redirect";
import { createCheckout, type CheckoutResult } from "@/lib/api/checkout";
import { writeGuestCheckoutEmail, readGuestCheckoutEmail } from "@/lib/checkout/guest-email";
import { validateDiscountCode } from "@/lib/api/discount";
import { getAccentPreset } from "@/lib/branding/accents";
import { findDropProduct } from "@/lib/drop-products";
import { cartLineKey } from "@/lib/cart/keys";
import {
  buildCheckoutFailedUrl,
  checkoutFailureFromHttpStatus,
} from "@/lib/checkout-failure";
import { useDropInventory } from "@/lib/hooks/use-drop-inventory";
import {
  getStripe,
  isDevPaymentIntent,
  isStripeConfigured,
} from "@/lib/stripe/client";
import type { PublicDrop } from "@/lib/types";
import type { DiscountPreview } from "@/lib/types/discount";
import { readReferralCookie } from "@/lib/referral-client";

type CheckoutSession = {
  orderId: string;
  clientSecret: string;
};

function CheckoutContent() {
  const { lines, removeItem } = useCart();
  const searchParams = useSearchParams();
  const itemKey = searchParams.get("item");

  const activeLine = useMemo(() => {
    if (itemKey) {
      const match = lines.find((line) => cartLineKey(line) === itemKey);
      if (match) return match;
    }
    return lines[0] ?? null;
  }, [itemKey, lines]);

  if (lines.length === 0) {
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

  return (
    <div className="space-y-6">
      {lines.length > 1 && (
        <CartLinesPanel
          lines={lines}
          activeKey={activeLine ? cartLineKey(activeLine) : null}
          onRemove={removeItem}
        />
      )}
      {activeLine ? (
        <CheckoutWithLine line={activeLine} />
      ) : (
        <div className="text-center">
          <p className="text-sm text-sakura-stone">Select an item from your cart.</p>
        </div>
      )}
    </div>
  );
}

function CheckoutWithLine({
  line,
}: {
  line: NonNullable<ReturnType<typeof useCart>["line"]>;
}) {
  const [drop, setDrop] = useState<PublicDrop | null>(null);
  const [loadingDrop, setLoadingDrop] = useState(true);

  useEffect(() => {
    fetch(`/api/public/${line.sellerSlug}/${line.dropSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setDrop(data?.drop ?? null);
        setLoadingDrop(false);
      })
      .catch(() => setLoadingDrop(false));
  }, [line.dropSlug, line.sellerSlug]);

  if (loadingDrop) {
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

  return <CheckoutLiveForm line={line} initialDrop={drop} />;
}

function CheckoutLiveForm({
  line,
  initialDrop,
}: {
  line: NonNullable<ReturnType<typeof useCart>["line"]>;
  initialDrop: PublicDrop;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutReturnPath = `/checkout${
    searchParams.toString() ? `?${searchParams.toString()}` : ""
  }`;

  const inventory = useDropInventory({
    sellerSlug: line.sellerSlug,
    dropSlug: line.dropSlug,
    initialRemaining: initialDrop.inventoryRemaining,
    total: initialDrop.inventoryTotal,
    status: initialDrop.status,
    startsAt: initialDrop.startsAt,
    endsAt: initialDrop.endsAt,
    initialSizes: initialDrop.sizes,
    pollMs: 8_000,
  });

  const drop: PublicDrop = {
    ...initialDrop,
    inventoryRemaining: inventory.remaining,
    status: inventory.status,
    sizes: inventory.sizes.length > 0 ? inventory.sizes : initialDrop.sizes,
  };

  const [email, setEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
  const [reservedPricing, setReservedPricing] = useState<CheckoutResult | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  const referralCode = useMemo(() => {
    const referral = readReferralCookie();
    return referral?.sellerSlug === line.sellerSlug ? referral.code : null;
  }, [line.sellerSlug]);

  const checkoutProduct = findDropProduct(drop, line.productId);
  const productSizes = checkoutProduct?.sizes ?? drop.sizes;

  const sizeAvailable =
    productSizes.find((size) => size.label === line.sizeLabel)?.available ?? true;
  const productRemaining = checkoutProduct?.inventoryRemaining ?? drop.inventoryRemaining;
  const canReserve =
    drop.status === "live" && productRemaining > 0 && sizeAvailable;

  useEffect(() => {
    fetch("/api/auth/buyer/me")
      .then((res) => {
        if (!res.ok) {
          setEmail(readGuestCheckoutEmail());
          return null;
        }
        return res.json() as Promise<{ session?: { email?: string } }>;
      })
      .then((data) => {
        if (data?.session?.email) {
          setEmail(data.session.email);
          setIsLoggedIn(true);
        }
      })
      .finally(() => setLoadingBuyer(false));
  }, []);

  if (loadingBuyer) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canReserve && !session) {
    return (
      <div className="text-center">
        <p className="text-sakura-stone">
          {drop.status === "sold_out" || drop.inventoryRemaining <= 0
            ? "This drop just sold out."
            : "Your size is no longer available."}
        </p>
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
    if (!email.trim() || !drop || !canReserve) return;
    setReserving(true);
    setError(null);

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `checkout-${line.sellerSlug}-${line.dropSlug}-${line.sizeLabel}`;
      }

      const result = await createCheckout({
        dropId: drop.id,
        productId: line.productId,
        sizeLabel: line.sizeLabel,
        buyerEmail: email.trim(),
        idempotencyKey: idempotencyKeyRef.current,
        discountCode: appliedCode ?? undefined,
      });

      writeGuestCheckoutEmail(email.trim());

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
      setReservedPricing(result);
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

  const accentPreset = getAccentPreset(drop.sellerAccent);

  const displayPricing = buildCheckoutPricing(
    reservedPricing
      ? {
          currency: reservedPricing.currency,
          subtotalCents: reservedPricing.subtotalCents,
          discountCents: reservedPricing.discountCents,
          finalCents: reservedPricing.amountCents,
          discountCode: appliedCode,
          referralCode: referralCode ?? undefined,
          referralPending: false,
        }
      : {
          currency: line.currency,
          subtotalCents:
            discountPreview?.valid && discountPreview.subtotalCents > 0
              ? discountPreview.subtotalCents
              : line.priceCents,
          discountCents:
            discountPreview?.valid && discountPreview.discountCents > 0
              ? discountPreview.discountCents
              : 0,
          finalCents:
            discountPreview?.valid && discountPreview.finalCents >= 0
              ? discountPreview.finalCents
              : line.priceCents,
          discountCode: appliedCode,
          referralCode: referralCode ?? undefined,
          referralPending: Boolean(referralCode),
        },
  );

  return (
    <SellerBrandTheme accent={drop.sellerAccent}>
      <div className="space-y-6">
      <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
        <h1 className="font-semibold text-sakura-ink">{line.dropTitle}</h1>
        <p className="mt-1 text-sm text-sakura-mist">Size {line.sizeLabel}</p>
        <div className="mt-4">
          <CheckoutSavingsSummary pricing={displayPricing} />
        </div>
      </section>

      <p className="text-sm font-medium text-sakura-warning">
        Limited units — complete checkout to secure yours.{" "}
        <span className="brand-accent-text font-mono">
          {drop.inventoryRemaining} left
        </span>
        {inventory.critical && drop.inventoryRemaining > 0 && (
          <span className="ml-1 text-sakura-warning">— almost gone</span>
        )}
      </p>

      {!canReserve && session && (
        <p className="text-sm text-sakura-mist" role="status">
          Inventory is low — your reservation is held while you complete payment.
        </p>
      )}

      {session ? (
        <Elements
          stripe={getStripe()}
          options={{
            clientSecret: session.clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: accentPreset.primary,
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
            pricing={displayPricing}
            onBack={() => {
              setSession(null);
              setReservedPricing(null);
              idempotencyKeyRef.current = null;
            }}
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
              readOnly={isLoggedIn}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={reserving}
              className={isLoggedIn ? "bg-sakura-surface text-sakura-stone" : undefined}
              autoComplete="email"
            />
            <p className="mt-1 text-xs text-sakura-mist">
              {isLoggedIn
                ? "Receipt and order updates go to your account email."
                : "Guest checkout — enter your email for receipt and order updates."}
            </p>
            {!isLoggedIn && (
              <p className="mt-2 text-xs text-sakura-mist">
                Have an account?{" "}
                <NextLink
                  href={authUrl({ role: "buyer", next: checkoutReturnPath })}
                  className="brand-accent-link font-medium hover:underline"
                >
                  Sign in
                </NextLink>
              </p>
            )}
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
            variant="brand"
            className="w-full"
            size="lg"
            disabled={reserving || !email.trim() || !canReserve}
            onClick={handleReserve}
          >
            {reserving ? "Reserving your unit…" : "Continue to payment"}
          </Button>
        </>
      )}
      </div>
    </SellerBrandTheme>
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
