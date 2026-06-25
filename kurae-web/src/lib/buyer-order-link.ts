import { buildCheckoutFailedUrl, normalizeFailureReason } from "@/lib/checkout-failure";
import type { BuyerOrderListItem } from "@/lib/types/buyer-order";

export function buyerOrderHref(
  order: BuyerOrderListItem,
  buyerEmail: string,
): string {
  const email = encodeURIComponent(buyerEmail);

  if (order.status === "payment_pending" || order.status === "reserved") {
    const params = new URLSearchParams({
      order: order.orderId,
      seller: order.sellerSlug,
      drop: order.dropSlug,
      size: order.sizeLabel,
      email: buyerEmail,
    });
    return `/checkout/pending?${params.toString()}`;
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    return buildCheckoutFailedUrl({
      reason: normalizeFailureReason(order.status),
      order: order.orderId,
      seller: order.sellerSlug,
      drop: order.dropSlug,
      size: order.sizeLabel,
    });
  }

  return `/orders/${order.orderId}/confirmation?email=${email}`;
}
