import { ApiError } from "@/lib/api/client";

export type CheckoutResult = {
  orderId: string;
  clientSecret: string;
  amountCents: number;
  currency: string;
  reservationUntil: string;
  status: string;
};

export async function createCheckout(input: {
  dropId: string;
  sizeLabel: string;
  idempotencyKey?: string;
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
      sizeLabel: input.sizeLabel,
      idempotencyKey: input.idempotencyKey,
    }),
  });
  if (!res.ok) {
    throw new ApiError(await res.text(), res.status);
  }
  return res.json() as Promise<CheckoutResult>;
}
