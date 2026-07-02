"use client";

import Link from "next/link";

import { useCart } from "@/contexts/cart-context";

export function RemainingCartBanner() {
  const { count } = useCart();

  if (count === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-md border border-sakura-petal bg-sakura-paper px-4 py-3 text-center text-sm text-sakura-stone">
      <span className="font-medium text-sakura-ink">
        {count} more {count === 1 ? "item" : "items"}
      </span>{" "}
      in your cart.{" "}
      <Link href="/checkout" className="brand-accent-link font-medium hover:underline">
        Continue checkout
      </Link>
    </div>
  );
}
