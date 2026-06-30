import type { OrderEvent, OrderStatus } from "@/lib/types/orders";

export type BuyerOrderListItem = {
  orderId: string;
  status: OrderStatus;
  sellerSlug: string;
  dropSlug: string;
  dropTitle: string;
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
  sizeLabel: string;
  subtotalCents: number;
  discountCents: number;
  discountCode?: string | null;
  amountCents: number;
  currency: string;
  buyerEmail: string;
  updatedAt: string;
  events: OrderEvent[];
};
