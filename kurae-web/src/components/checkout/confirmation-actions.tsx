"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { brandCtaLinkClass } from "@/lib/branding/cta";
import { authUrl } from "@/lib/auth/safe-redirect";

type ConfirmationActionsProps = {
  orderId: string;
  sellerSlug: string;
  dropSlug: string;
};

export function ConfirmationActions({
  orderId,
  sellerSlug,
  dropSlug,
}: ConfirmationActionsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/buyer/me")
      .then((res) => {
        if (!cancelled) {
          setIsLoggedIn(res.ok);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoggedIn(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoggedIn === null) {
    return <div className="mt-8 h-20 animate-pulse rounded-md bg-sakura-petal/40" />;
  }

  const orderPath = `/account/orders/${orderId}`;
  const signupHref = authUrl({
    mode: "signup",
    role: "buyer",
    next: orderPath,
  });

  return (
    <div className="mt-8 flex flex-col gap-3">
      {isLoggedIn ? (
        <Link href={orderPath} className={`${brandCtaLinkClass} h-10 w-full`}>
          View in my orders
        </Link>
      ) : (
        <>
          <p className="text-center text-xs text-sakura-mist">
            Guest checkout — save this link or create an account to track your order.
          </p>
          <Link href={signupHref} className={`${brandCtaLinkClass} h-10 w-full`}>
            Create account
          </Link>
          <Link
            href={authUrl({ role: "buyer", next: orderPath })}
            className="flex h-10 w-full items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper text-sm font-medium text-sakura-ink hover:bg-sakura-surface"
          >
            Sign in
          </Link>
        </>
      )}
      <Link
        href={`/${sellerSlug}/${dropSlug}`}
        className="flex h-10 w-full items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper text-sm font-medium text-sakura-ink hover:bg-sakura-surface"
      >
        Back to drop
      </Link>
    </div>
  );
}
