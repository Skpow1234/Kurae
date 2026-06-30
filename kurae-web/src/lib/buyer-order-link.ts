import type { BuyerOrderListItem } from "@/lib/types/buyer-order";

export function buyerOrderHref(order: BuyerOrderListItem): string {
  if (order.status === "payment_pending" || order.status === "reserved") {
    const params = new URLSearchParams({
      order: order.orderId,
      seller: order.sellerSlug,
      drop: order.dropSlug,
      size: order.sizeLabel,
    });
    return `/checkout/pending?${params.toString()}`;
  }

  return `/account/orders/${order.orderId}`;
}
