import { ApiError } from "@/lib/api/client";

export type CheckoutResult = {
  orderId: string;
  clientSecret: string;
  subtotalCents: number;
  discountCents: number;
  amountCents: number;
  currency: string;
  reservationUntil: string;
  status: string;
};

import type { ShippingAddress } from "@/lib/types/shipping";

export async function createCheckout(input: {
  dropId: string;
  productId: string;
  sizeLabel: string;
  buyerEmail: string;
  shippingAddress: ShippingAddress;
  idempotencyKey?: string;
  discountCode?: string;
}): Promise<CheckoutResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers,
    body: JSON.stringify({
      dropId: input.dropId,
      productId: input.productId,
      sizeLabel: input.sizeLabel,
      buyerEmail: input.buyerEmail.trim(),
      shippingAddress: input.shippingAddress,
      idempotencyKey: input.idempotencyKey,
      discountCode: input.discountCode?.trim() || undefined,
    }),
  });
  if (!res.ok) {
    throw new ApiError(await res.text(), res.status);
  }
  return res.json() as Promise<CheckoutResult>;
}
