import type { OrderEvent, OrderStatus } from "@/lib/types/orders";
import type { ShippingAddress } from "@/lib/types/shipping";

export type BuyerOrderListItem = {
  orderId: string;
  status: OrderStatus;
  sellerSlug: string;
  dropSlug: string;
  dropTitle: string;
  productName?: string;
  sizeLabel: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

export type BuyerOrderStatus = {
  orderId: string;
  status: OrderStatus;
  sellerSlug: string;
  dropSlug: string;
  dropTitle: string;
  productName?: string;
  sizeLabel: string;
  subtotalCents: number;
  discountCents: number;
  discountCode?: string | null;
  referralCode?: string | null;
  amountCents: number;
  currency: string;
  buyerEmail: string;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  shippedAt?: string;
  updatedAt: string;
  events: OrderEvent[];
};
