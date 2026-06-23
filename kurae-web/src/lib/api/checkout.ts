import { requireApiBase } from "@/lib/api/config";

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
  buyerEmail: string;
  sizeLabel: string;
  idempotencyKey?: string;
}): Promise<CheckoutResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const res = await fetch(`${requireApiBase()}/checkout`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      dropId: input.dropId,
      buyerEmail: input.buyerEmail,
      sizeLabel: input.sizeLabel,
      idempotencyKey: input.idempotencyKey,
    }),
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  return res.json() as Promise<CheckoutResult>;
}
