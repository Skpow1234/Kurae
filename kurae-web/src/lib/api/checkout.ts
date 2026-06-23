import { getApiBase, isApiConfigured } from "@/lib/api/config";

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

  if (isApiConfigured()) {
    const res = await fetch(`${getApiBase()}/checkout`, {
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

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Checkout failed");
  }
  return res.json() as Promise<CheckoutResult>;
}
