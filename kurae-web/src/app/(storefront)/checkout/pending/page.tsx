"use client";

import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { useCart } from "@/contexts/cart-context";
import { buildCheckoutFailedUrl, normalizeFailureReason } from "@/lib/checkout-failure";
import type { BuyerOrderStatus } from "@/lib/types/buyer-order";
import type { OrderStatus } from "@/lib/types/orders";

const POLL_MS = 2000;
const TIMEOUT_MS = 3 * 60 * 1000;

const PAID_STATUSES: OrderStatus[] = ["paid", "fulfilled"];
const FAILED_STATUSES: OrderStatus[] = ["cancelled", "refunded"];

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clear } = useCart();

  const orderId = searchParams.get("order") ?? "";
  const seller = searchParams.get("seller") ?? "";
  const drop = searchParams.get("drop") ?? "";
  const size = searchParams.get("size") ?? "";
  const email = searchParams.get("email") ?? "";

  const [lastStatus, setLastStatus] = useState<BuyerOrderStatus | null>(null);

  useEffect(() => {
    const redirectStatus = searchParams.get("redirect_status");
    if (redirectStatus === "failed") {
      router.replace(
        buildCheckoutFailedUrl({
          reason: "payment_failed",
          order: orderId || undefined,
          seller: seller || undefined,
          drop: drop || undefined,
          size: size || undefined,
          message:
            "Your bank declined the payment or authentication did not complete.",
        }),
      );
      return;
    }
  }, [drop, orderId, router, searchParams, seller, size]);

  useEffect(() => {
    if (!orderId || !email) return;

    let cancelled = false;
    const started = Date.now();

    async function poll() {
      while (!cancelled) {
        if (Date.now() - started > TIMEOUT_MS) {
          router.replace(
            buildCheckoutFailedUrl({
              reason: "timeout",
              order: orderId,
              seller: seller || undefined,
              drop: drop || undefined,
              size: size || undefined,
            }),
          );
          return;
        }

        try {
          const qs = new URLSearchParams({ email });
          const res = await fetch(
            `/api/checkout/orders/${orderId}/status?${qs.toString()}`,
          );
          if (res.ok) {
            const status = (await res.json()) as BuyerOrderStatus;
            setLastStatus(status);

            if (PAID_STATUSES.includes(status.status)) {
              clear();
              const params = new URLSearchParams({
                seller: status.sellerSlug,
                drop: status.dropSlug,
                size: status.sizeLabel,
                email: status.buyerEmail,
              });
              router.replace(
                `/orders/${status.orderId}/confirmation?${params.toString()}`,
              );
              return;
            }

            if (FAILED_STATUSES.includes(status.status)) {
              router.replace(
                buildCheckoutFailedUrl({
                  reason: normalizeFailureReason(status.status),
                  order: orderId,
                  seller: status.sellerSlug,
                  drop: status.dropSlug,
                  size: status.sizeLabel,
                }),
              );
              return;
            }
          }
        } catch {
          // keep polling
        }

        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [clear, drop, email, orderId, router, seller, size]);

  if (!orderId || !email) {
    return (
      <div className="text-center">
        <p className="text-sm text-sakura-stone">Missing order details.</p>
        <NextLink
          href="/checkout"
          className="mt-4 inline-block text-sm text-sakura-dusk hover:underline"
        >
          Back to checkout
        </NextLink>
      </div>
    );
  }

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
        Waiting for payment confirmation. Do not close this page.
      </p>
      {lastStatus && (
        <p className="mt-3 text-xs capitalize text-sakura-mist">
          Status: {lastStatus.status.replace("_", " ")}
        </p>
      )}
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
