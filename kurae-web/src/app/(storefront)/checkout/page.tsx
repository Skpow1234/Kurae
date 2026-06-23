"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { StripePaymentMock } from "@/components/checkout/stripe-payment-mock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { createCheckout } from "@/lib/api/checkout";
import type { PublicDrop } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

function CheckoutContent() {
  const router = useRouter();
  const { line } = useCart();
  const [drop, setDrop] = useState<PublicDrop | null>(null);
  const [loadingDrop, setLoadingDrop] = useState(true);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "reserving">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!line) {
      setLoadingDrop(false);
      return;
    }

    fetch(`/api/public/${line.sellerSlug}/${line.dropSlug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setDrop(data?.drop ?? null);
        setLoadingDrop(false);
      })
      .catch(() => setLoadingDrop(false));
  }, [line]);

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

  async function handlePay() {
    if (!email.trim() || !drop) return;
    setState("reserving");
    setError(null);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `checkout-${Date.now()}`;

      const result = await createCheckout({
        dropId: drop.id,
        buyerEmail: email.trim(),
        sizeLabel: line!.sizeLabel,
        idempotencyKey,
      });

      const params = new URLSearchParams({
        order: result.orderId,
        drop: line!.dropSlug,
        size: line!.sizeLabel,
        email,
      });
      router.push(`/checkout/pending?${params.toString()}`);
    } catch {
      setError("Could not reserve inventory. The drop may have sold out.");
      setState("idle");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
        <h1 className="font-semibold text-sakura-ink">{line.dropTitle}</h1>
        <p className="mt-1 text-sm text-sakura-mist">Size {line.sizeLabel}</p>
        <p className="mt-3 font-mono text-lg font-semibold text-sakura-dusk">
          {formatPrice(line.priceCents, line.currency)}
        </p>
      </section>

      <p className="text-sm font-medium text-sakura-warning">
        Limited units — complete checkout to secure yours.{" "}
        <span className="font-mono text-sakura-dusk">
          {drop.inventoryRemaining} left
        </span>
      </p>

      <StripePaymentMock
        email={email}
        onEmailChange={setEmail}
        disabled={state !== "idle"}
      />

      {error && (
        <p className="text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}

      <Button
        className="w-full bg-sakura-blush text-sakura-ink hover:bg-sakura-bloom"
        size="lg"
        disabled={state !== "idle" || !email.trim()}
        onClick={handlePay}
      >
        {state === "idle" ? "Pay now" : "Reserving your unit…"}
      </Button>

      <button
        type="button"
        className="w-full text-center text-xs text-sakura-mist underline"
        onClick={() =>
          router.push(
            `/checkout/failed?drop=${line.dropSlug}&size=${line.sizeLabel}`,
          )
        }
      >
        Simulate payment failure
      </button>
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
