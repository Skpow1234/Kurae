export type DropStatus = "upcoming" | "live" | "sold_out" | "expired";

export type PublishStatus = "draft" | "scheduled" | "published";

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
  sellerLogoUrl?: string;
  sellerAccent?: BrandAccent;
  sellerBio?: string;
};

export type BrandAccent = "blush" | "dusk" | "teal";

export type PublicSeller = {
  slug: string;
  name: string;
  logoUrl?: string;
  accent?: BrandAccent;
  bio?: string;
};

export type SellerBranding = {
  logoUrl: string;
  accent: BrandAccent;
  bio: string;
};

export type SellerDrop = Omit<PublicDrop, "status"> & {
  publishStatus: PublishStatus;
};

export type SellerSession = {
  role: "seller";
  email: string;
  sellerSlug: string;
  sellerName: string;
};

export type BuyerSession = {
  role: "buyer";
  email: string;
  name: string;
};

export type KuraeSession = SellerSession | BuyerSession;

export type CartLine = {
  dropId: string;
  sellerSlug: string;
  dropSlug: string;
  dropTitle: string;
  sizeId: string;
  sizeLabel: string;
  priceCents: number;
  currency: string;
  heroImageUrl: string;
};

export type DropFormValues = {
  title: string;
  slug: string;
  description: string;
  story: string;
  priceDollars: string;
  inventory: string;
  startsAt: string;
  endsAt: string;
  promoMessage: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  sizes: DropSize[];
  publishStatus: PublishStatus;
};
