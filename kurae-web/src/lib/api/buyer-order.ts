import { apiFetch } from "@/lib/api/client";
import type { BuyerOrderStatus } from "@/lib/types/buyer-order";

export async function fetchBuyerOrderStatus(
  orderId: string,
  email: string,
): Promise<BuyerOrderStatus> {
  const qs = new URLSearchParams({ email });
  return apiFetch<BuyerOrderStatus>(
    `/checkout/orders/${orderId}/status?${qs.toString()}`,
  );
}
