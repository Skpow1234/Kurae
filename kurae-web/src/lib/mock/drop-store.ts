import type { DropStatus, PublicDrop, SellerDrop } from "@/lib/types";

export function resolveDropStatus(
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

export function toPublicDrop(record: SellerDrop): PublicDrop {
  return {
    ...record,
    status: resolveDropStatus(
      record.startsAt,
      record.endsAt,
      record.inventoryRemaining,
    ),
  };
}

const defaultSizes = [
  { id: "s", label: "S", available: true },
  { id: "m", label: "M", available: true },
  { id: "l", label: "L", available: true },
  { id: "xl", label: "XL", available: true },
];

function seedDrops(): SellerDrop[] {
  const now = Date.now();
  return [
    {
      id: "drop_01",
      sellerSlug: "hana-studio",
      sellerName: "Hana Studio",
      slug: "sakura-hoodie",
      title: "Sakura Hoodie — Drop 001",
      description:
        "Heavyweight fleece. Embroidered petal mark. Limited to 120 units.",
      story:
        "Inspired by late-season sakura — dusty blush on warm stone. Cut wide, dropped shoulder, woven label at hem. Each piece numbered.",
      priceCents: 8900,
      currency: "USD",
      heroImageUrl:
        "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&q=80",
      galleryImageUrls: [
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
        "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
      ],
      inventoryTotal: 120,
      inventoryRemaining: 47,
      waitlistCount: 384,
      startsAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
      promoMessage: "Domestic shipping free on orders over $100",
      sizes: defaultSizes,
      publishStatus: "published",
    },
    {
      id: "drop_02",
      sellerSlug: "hana-studio",
      sellerName: "Hana Studio",
      slug: "sakura-tee",
      title: "Sakura Tee — Drop 002",
      description: "Soft cotton tee. Screen-printed petal graphic.",
      story: "Lightweight tee for spring layering.",
      priceCents: 4500,
      currency: "USD",
      heroImageUrl:
        "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1600&q=80",
      galleryImageUrls: [],
      inventoryTotal: 200,
      inventoryRemaining: 200,
      waitlistCount: 128,
      startsAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString(),
      promoMessage: "Drop 002 — notify list opens 72h before launch",
      sizes: defaultSizes,
      publishStatus: "published",
    },
    {
      id: "drop_03",
      sellerSlug: "hana-studio",
      sellerName: "Hana Studio",
      slug: "sakura-cap",
      title: "Sakura Cap — Drop 000",
      description: "Structured cap with embroidered kanji.",
      story: "Sold out release from last season.",
      priceCents: 3500,
      currency: "USD",
      heroImageUrl:
        "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1600&q=80",
      galleryImageUrls: [],
      inventoryTotal: 80,
      inventoryRemaining: 0,
      waitlistCount: 512,
      startsAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
      promoMessage: "Sold out — join the waitlist for possible restock",
      sizes: defaultSizes,
      publishStatus: "published",
    },
    {
      id: "drop_04",
      sellerSlug: "hana-studio",
      sellerName: "Hana Studio",
      slug: "winter-bloom",
      title: "Winter Bloom Jacket",
      description: "Insulated jacket. Limited run.",
      story: "Past season drop.",
      priceCents: 12000,
      currency: "USD",
      heroImageUrl:
        "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1600&q=80",
      galleryImageUrls: [],
      inventoryTotal: 50,
      inventoryRemaining: 3,
      waitlistCount: 0,
      startsAt: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      promoMessage: null,
      sizes: defaultSizes,
      publishStatus: "published",
    },
  ];
}

type StoreGlobal = { kuraeDropStore?: Map<string, SellerDrop> };

function getStore(): Map<string, SellerDrop> {
  const g = globalThis as StoreGlobal;
  if (!g.kuraeDropStore) {
    g.kuraeDropStore = new Map(seedDrops().map((d) => [d.id, d]));
  }
  return g.kuraeDropStore;
}

export function listDropsBySeller(sellerSlug: string): SellerDrop[] {
  return [...getStore().values()].filter((d) => d.sellerSlug === sellerSlug);
}

export function getDropById(id: string): SellerDrop | null {
  return getStore().get(id) ?? null;
}

export function getDropBySlug(
  sellerSlug: string,
  slug: string,
): SellerDrop | null {
  return (
    [...getStore().values()].find(
      (d) => d.sellerSlug === sellerSlug && d.slug === slug,
    ) ?? null
  );
}

export function getPublicDrop(
  sellerSlug: string,
  dropSlug: string,
  options?: { allowDraft?: boolean },
): PublicDrop | null {
  const record = getDropBySlug(sellerSlug, dropSlug);
  if (!record) return null;
  if (record.publishStatus === "draft" && !options?.allowDraft) return null;
  return toPublicDrop(record);
}

export function createDrop(
  data: Omit<SellerDrop, "id" | "waitlistCount" | "inventoryRemaining"> & {
    inventoryTotal: number;
  },
): SellerDrop {
  const id = `drop_${crypto.randomUUID().slice(0, 8)}`;
  const drop: SellerDrop = {
    ...data,
    id,
    inventoryRemaining: data.inventoryTotal,
    waitlistCount: 0,
  };
  getStore().set(id, drop);
  return drop;
}

export function updateDrop(
  id: string,
  patch: Partial<SellerDrop>,
): SellerDrop | null {
  const existing = getStore().get(id);
  if (!existing) return null;

  const inventoryTotal = patch.inventoryTotal ?? existing.inventoryTotal;
  const inventoryRemaining =
    patch.inventoryRemaining ??
    (patch.inventoryTotal !== undefined
      ? Math.min(existing.inventoryRemaining, inventoryTotal)
      : existing.inventoryRemaining);

  const updated: SellerDrop = {
    ...existing,
    ...patch,
    inventoryTotal,
    inventoryRemaining,
  };
  getStore().set(id, updated);
  return updated;
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

// Legacy export for checkout mock
export const demoDropLive = toPublicDrop(getDropById("drop_01")!);
