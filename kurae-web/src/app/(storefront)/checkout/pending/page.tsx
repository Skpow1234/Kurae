"use client";

import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { useCart } from "@/contexts/cart-context";

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clear } = useCart();

  const drop = searchParams.get("drop") ?? "sakura-hoodie";
  const size = searchParams.get("size") ?? "M";
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    const timer = setTimeout(() => {
      clear();
      const params = new URLSearchParams({ drop, size, email });
      router.replace(`/orders/ord_001/confirmation?${params.toString()}`);
    }, 2500);
    return () => clearTimeout(timer);
  }, [clear, drop, size, email, router]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-sakura-petal border-t-sakura-blush" />
      <p className="text-xs uppercase tracking-widest text-sakura-bloom">
        Payment pending
      </p>
      <h1 className="mt-2 text-xl font-semibold text-sakura-ink">
        Confirming your payment…
      </h1>
      <p className="mt-2 text-sm text-sakura-mist">
        Waiting for Stripe webhook confirmation. Do not close this page.
      </p>
    </div>
  );
}

export default function CheckoutPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md">
        <Suspense>
          <PendingContent />
        </Suspense>
        <p className="mt-8 text-center text-xs text-sakura-mist">
          <NextLink href="/checkout" className="hover:text-sakura-dusk">
            Back to checkout
          </NextLink>
        </p>
      </div>
    </main>
  );
}
