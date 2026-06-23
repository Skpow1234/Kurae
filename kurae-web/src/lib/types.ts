export type DropStatus = "upcoming" | "live" | "sold_out" | "expired";

export type DropSize = {
  id: string;
  label: string;
  available: boolean;
};

export type PublicDrop = {
  id: string;
  sellerSlug: string;
  sellerName: string;
  slug: string;
  title: string;
  description: string;
  story: string;
  priceCents: number;
  currency: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  inventoryTotal: number;
  inventoryRemaining: number;
  waitlistCount: number;
  startsAt: string;
  endsAt: string;
  status: DropStatus;
  promoMessage: string | null;
  sizes: DropSize[];
};

export type CartItem = {
  dropId: string;
  sizeId: string;
  quantity: number;
};
