import type { DiscountPreview } from "@/lib/types/discount";

export async function validateDiscountCode(input: {
  dropId: string;
  code: string;
}): Promise<DiscountPreview> {
  const res = await fetch("/api/checkout/discount/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Could not validate code");
  }
  return res.json() as Promise<DiscountPreview>;
}
