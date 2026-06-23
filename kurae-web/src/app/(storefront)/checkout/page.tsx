"use client";

import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import type { PublicDrop } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

function CheckoutContent() {
  const router = useRouter();
  const { line, clear } = useCart();
  const [drop, setDrop] = useState<PublicDrop | null>(null);
  const [loadingDrop, setLoadingDrop] = useState(true);
  const [state, setState] = useState<
    "idle" | "reserving" | "pending" | "failed"
  >("idle");

  useEffect(() => {
    if (!line) {
      setLoadingDrop(false);
      return;
    }

    fetch(`/api/mock/public/${line.sellerSlug}/${line.dropSlug}`)
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
    setState("reserving");
    await new Promise((r) => setTimeout(r, 800));
    setState("pending");
    await new Promise((r) => setTimeout(r, 1200));
    clear();
    router.push(
      `/orders/demo-ord-001/confirmation?drop=${line!.dropSlug}&size=${line!.sizeLabel}`,
    );
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

      {state === "failed" && (
        <p className="rounded-md border border-sakura-warning/30 bg-sakura-petal px-3 py-2 text-sm text-sakura-warning">
          Payment failed. Try again or use a different card.
        </p>
      )}

      <section className="space-y-3 rounded-lg border border-sakura-petal p-4">
        <p className="text-sm text-sakura-mist">
          {state === "idle" && "Stripe checkout mounts here when kurae-api is connected."}
          {state === "reserving" && "Reserving your unit…"}
          {state === "pending" && "Redirecting to payment…"}
        </p>
        <Button
          className="w-full bg-sakura-blush text-sakura-ink hover:bg-sakura-bloom"
          size="lg"
          disabled={state !== "idle"}
          onClick={handlePay}
        >
          {state === "idle" ? "Pay with Stripe" : "Processing…"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-xs text-sakura-mist underline"
          onClick={() => setState("failed")}
        >
          Simulate payment failure
        </button>
      </section>
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
