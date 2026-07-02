"use client";

import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import { ApiLoadError } from "@/components/ui/api-load-error";
import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/cart-context";
import { buildCheckoutFailedUrl, normalizeFailureReason } from "@/lib/checkout-failure";
import { useSellerAccent } from "@/lib/branding/use-seller-accent";
import type { BuyerOrderStatus } from "@/lib/types/buyer-order";
import type { OrderStatus } from "@/lib/types/orders";

const POLL_MS = 2000;
const TIMEOUT_MS = 3 * 60 * 1000;
const MAX_POLL_FAILURES = 3;

const PAID_STATUSES: OrderStatus[] = ["paid", "fulfilled"];
const FAILED_STATUSES: OrderStatus[] = ["cancelled", "refunded"];

function PendingFallback() {
  return (
    <div className="text-center" aria-busy="true" aria-label="Loading">
      <Skeleton className="mx-auto mb-6 h-12 w-12 rounded-full" />
      <Skeleton className="mx-auto h-4 w-40" />
      <Skeleton className="mx-auto mt-3 h-6 w-56" />
    </div>
  );
}

function PendingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { removeMatching } = useCart();

  const orderId = searchParams.get("order") ?? "";
  const seller = searchParams.get("seller") ?? "";
  const drop = searchParams.get("drop") ?? "";
  const size = searchParams.get("size") ?? "";
  const emailFromQuery = searchParams.get("email") ?? "";

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(!emailFromQuery);
  const [lastStatus, setLastStatus] = useState<BuyerOrderStatus | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  const buyerEmail = emailFromQuery || sessionEmail || "";
  const accent = useSellerAccent(seller || undefined, drop || undefined);

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
    }
  }, [drop, orderId, router, searchParams, seller, size]);

  useEffect(() => {
    if (emailFromQuery) return;

    let cancelled = false;
    fetch("/api/auth/buyer/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { session?: { email?: string } } | null) => {
        if (cancelled) return;
        if (data?.session?.email) {
          setSessionEmail(data.session.email);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingEmail(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [emailFromQuery]);

  useEffect(() => {
    if (!orderId || !buyerEmail) return;

    let cancelled = false;
    const started = Date.now();
    let consecutiveFailures = 0;

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
          const qs = new URLSearchParams({ email: buyerEmail });
          const res = await fetch(
            `/api/checkout/orders/${orderId}/status?${qs.toString()}`,
          );

          if (res.ok) {
            consecutiveFailures = 0;
            setPollError(null);

            const status = (await res.json()) as BuyerOrderStatus;
            setLastStatus(status);

            if (PAID_STATUSES.includes(status.status)) {
              removeMatching({
                sellerSlug: status.sellerSlug,
                dropSlug: status.dropSlug,
                sizeLabel: status.sizeLabel,
              });
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
          } else {
            consecutiveFailures += 1;
            if (consecutiveFailures >= MAX_POLL_FAILURES) {
              setPollError(
                "Could not reach the server to confirm payment. We will keep trying, or you can retry now.",
              );
            }
          }
        } catch {
          consecutiveFailures += 1;
          if (consecutiveFailures >= MAX_POLL_FAILURES) {
            setPollError(
              "Could not reach the server to confirm payment. We will keep trying, or you can retry now.",
            );
          }
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [buyerEmail, drop, orderId, pollAttempt, removeMatching, router, seller, size]);

  const retryPoll = useCallback(() => {
    setPollError(null);
    setPollAttempt((value) => value + 1);
  }, []);

  if (loadingEmail) {
    return <PendingFallback />;
  }

  if (!orderId || !buyerEmail) {
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
    <SellerBrandTheme accent={accent}>
    <div className="text-center">
      <div className="brand-accent-spinner mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-sakura-petal" />
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
      {pollError && (
        <div className="mt-6 space-y-3 text-left">
          <ApiLoadError message={pollError} />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={retryPoll}
          >
            Retry now
          </Button>
        </div>
      )}
    </div>
    </SellerBrandTheme>
  );
}

export default function CheckoutPendingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<PendingFallback />}>
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
