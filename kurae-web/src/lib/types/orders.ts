export type OrderStatus =
  | "reserved"
  | "payment_pending"
  | "paid"
  | "shipped"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type OrderEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string;
};

import type { ShippingAddress } from "@/lib/types/shipping";

export type SellerOrder = {
  id: string;
  sellerSlug: string;
  dropId: string;
  dropTitle: string;
  dropSlug: string;
  buyerEmail: string;
  productName?: string;
  sizeLabel: string;
  status: OrderStatus;
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  shippedAt?: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
};
