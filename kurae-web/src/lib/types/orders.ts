export type OrderStatus =
  | "reserved"
  | "payment_pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type OrderEvent = {
  id: string;
  label: string;
  at: string;
  detail?: string;
};

export type SellerOrder = {
  id: string;
  sellerSlug: string;
  dropId: string;
  dropTitle: string;
  dropSlug: string;
  buyerEmail: string;
  sizeLabel: string;
  status: OrderStatus;
  amountCents: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
};
