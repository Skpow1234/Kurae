import { apiServerFetch } from "@/lib/api/server";
import type { DiscountCode } from "@/lib/types/discount";

export async function listDiscountCodes(): Promise<DiscountCode[]> {
  try {
    const data = await apiServerFetch<{ discountCodes: DiscountCode[] }>(
      "/discount-codes",
    );
    return data.discountCodes ?? [];
  } catch {
    return [];
  }
}
