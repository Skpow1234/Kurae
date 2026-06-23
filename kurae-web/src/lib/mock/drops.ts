import type { DropStatus, PublicDrop } from "@/lib/types";

function resolveStatus(
  startsAt: string,
  endsAt: string,
  inventoryRemaining: number,
): DropStatus {
  const now = Date.now();
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (now > end) return "expired";
  if (inventoryRemaining <= 0 && now >= start) return "sold_out";
  if (now < start) return "upcoming";
  return "live";
}

const demoDropBase = {
  id: "drop_01",
  sellerSlug: "hana-studio",
  sellerName: "Hana Studio",
  slug: "sakura-hoodie",
  title: "Sakura Hoodie — Drop 001",
  description: "Heavyweight fleece. Embroidered petal mark. Limited to 120 units.",
  story:
    "Inspired by late-season sakura — dusty blush on stone grey. Cut wide, dropped shoulder, woven label at hem. Each piece numbered.",
  priceCents: 8900,
  currency: "USD",
  heroImageUrl:
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&q=80",
  galleryImageUrls: [
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
  ],
  inventoryTotal: 120,
  waitlistCount: 384,
  sizes: [
    { id: "s", label: "S", available: true },
    { id: "m", label: "M", available: true },
    { id: "l", label: "L", available: true },
    { id: "xl", label: "XL", available: false },
  ],
  promoMessage: "Domestic shipping free on orders over $100",
} satisfies Omit<PublicDrop, "status" | "inventoryRemaining" | "startsAt" | "endsAt">;

export const demoDropLive: PublicDrop = {
  ...demoDropBase,
  inventoryRemaining: 47,
  startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  status: "live",
};

export const demoDropUpcoming: PublicDrop = {
  ...demoDropBase,
  slug: "sakura-tee",
  title: "Sakura Tee — Drop 002",
  inventoryRemaining: 200,
  startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
  status: "upcoming",
  promoMessage: "Drop 002 — notify list opens 72h before launch",
};

const dropsByKey: Record<string, PublicDrop> = {
  "hana-studio/sakura-hoodie": demoDropLive,
  "hana-studio/sakura-tee": demoDropUpcoming,
};

export function getMockDrop(
  sellerSlug: string,
  dropSlug: string,
): PublicDrop | null {
  const key = `${sellerSlug}/${dropSlug}`;
  const drop = dropsByKey[key];
  if (!drop) return null;

  const status = resolveStatus(
    drop.startsAt,
    drop.endsAt,
    drop.inventoryRemaining,
  );

  return { ...drop, status };
}

export function getStatusLabel(status: DropStatus): string {
  switch (status) {
    case "upcoming":
      return "UPCOMING";
    case "live":
      return "LIVE NOW";
    case "sold_out":
      return "SOLD OUT";
    case "expired":
      return "EXPIRED";
  }
}
