export type DiscountType = "percent" | "fixed";

export type DiscountCode = {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  maxUses?: number;
  usesCount: number;
  expiresAt?: string;
  dropId?: string;
  dropTitle?: string;
  active: boolean;
  createdAt: string;
};

export type DiscountPreview = {
  valid: boolean;
  code?: string;
  discountCents: number;
  subtotalCents: number;
  finalCents: number;
  currency: string;
  message?: string;
};
