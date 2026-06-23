import type { OrderStatus, SellerOrder } from "@/lib/types/orders";

function daysAgo(n: number, hour = 12): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function seedOrders(): SellerOrder[] {
  const base = {
    sellerSlug: "hana-studio",
    dropId: "drop_01",
    dropTitle: "Sakura Hoodie — Drop 001",
    dropSlug: "sakura-hoodie",
    currency: "USD",
    amountCents: 8900,
  };

  const templates: Omit<SellerOrder, "id" | "createdAt" | "updatedAt" | "events">[] = [
    { ...base, buyerEmail: "yuki.tanaka@email.com", sizeLabel: "M", status: "fulfilled" },
    { ...base, buyerEmail: "kenji.sato@email.com", sizeLabel: "L", status: "paid" },
    { ...base, buyerEmail: "mia.chen@email.com", sizeLabel: "S", status: "paid" },
    { ...base, buyerEmail: "alex@example.com", sizeLabel: "XL", status: "payment_pending" },
    { ...base, buyerEmail: "fan@example.com", sizeLabel: "M", status: "payment_pending" },
    { ...base, buyerEmail: "old@example.com", sizeLabel: "L", status: "cancelled" },
    { ...base, buyerEmail: "refund@example.com", sizeLabel: "S", status: "refunded" },
    { ...base, dropId: "drop_02", dropTitle: "Sakura Tee — Drop 002", dropSlug: "sakura-tee", buyerEmail: "tee@example.com", sizeLabel: "M", status: "reserved", amountCents: 4500 },
    { ...base, buyerEmail: "buyer1@email.com", sizeLabel: "S", status: "fulfilled" },
    { ...base, buyerEmail: "buyer2@email.com", sizeLabel: "M", status: "fulfilled" },
    { ...base, buyerEmail: "buyer3@email.com", sizeLabel: "L", status: "paid" },
    { ...base, buyerEmail: "buyer4@email.com", sizeLabel: "M", status: "paid" },
  ];

  return templates.map((t, i) => {
    const createdAt = daysAgo(i, 10 + (i % 8));
    const status = t.status;
    const events = buildEvents(status, createdAt);
    return {
      ...t,
      id: `ord_${String(i + 1).padStart(3, "0")}`,
      createdAt,
      updatedAt: events[events.length - 1]?.at ?? createdAt,
      events,
    };
  });
}

function buildEvents(status: OrderStatus, createdAt: string): import("@/lib/types/orders").OrderEvent[] {
  const t0 = createdAt;
  const events: import("@/lib/types/orders").OrderEvent[] = [
    { id: "e1", label: "Order created", at: t0 },
  ];

  if (["reserved", "payment_pending", "paid", "fulfilled", "cancelled", "refunded"].includes(status)) {
    events.push({
      id: "e2",
      label: "Inventory reserved",
      at: new Date(new Date(t0).getTime() + 60_000).toISOString(),
    });
  }
  if (["payment_pending", "paid", "fulfilled", "refunded"].includes(status)) {
    events.push({
      id: "e3",
      label: "Payment initiated",
      at: new Date(new Date(t0).getTime() + 120_000).toISOString(),
    });
  }
  if (["paid", "fulfilled", "refunded"].includes(status)) {
    events.push({
      id: "e4",
      label: "Payment confirmed",
      at: new Date(new Date(t0).getTime() + 300_000).toISOString(),
      detail: "Stripe webhook",
    });
  }
  if (status === "fulfilled") {
    events.push({
      id: "e5",
      label: "Marked fulfilled",
      at: new Date(new Date(t0).getTime() + 86400_000).toISOString(),
    });
  }
  if (status === "cancelled") {
    events.push({
      id: "e6",
      label: "Reservation expired",
      at: new Date(new Date(t0).getTime() + 900_000).toISOString(),
    });
  }
  if (status === "refunded") {
    events.push({
      id: "e7",
      label: "Refunded",
      at: new Date(new Date(t0).getTime() + 172800_000).toISOString(),
    });
  }

  return events;
}

type StoreGlobal = { kuraeOrderStore?: Map<string, SellerOrder> };

function getStore(): Map<string, SellerOrder> {
  const g = globalThis as StoreGlobal;
  if (!g.kuraeOrderStore) {
    g.kuraeOrderStore = new Map(seedOrders().map((o) => [o.id, o]));
  }
  return g.kuraeOrderStore;
}

export function listOrdersBySeller(sellerSlug: string): SellerOrder[] {
  return [...getStore().values()]
    .filter((o) => o.sellerSlug === sellerSlug)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrderById(id: string): SellerOrder | null {
  return getStore().get(id) ?? null;
}

export function getDashboardStats(sellerSlug: string) {
  const orders = listOrdersBySeller(sellerSlug);
  const paid = orders.filter((o) =>
    ["paid", "fulfilled"].includes(o.status),
  );
  const revenue = paid.reduce((sum, o) => sum + o.amountCents, 0);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const revenue7d = paid
    .filter((o) => new Date(o.createdAt).getTime() >= weekAgo)
    .reduce((sum, o) => sum + o.amountCents, 0);

  return {
    orderCount: orders.length,
    paidCount: paid.length,
    revenueCents: revenue,
    revenue7dCents: revenue7d,
    waitlistTotal: 512,
  };
}

export function formatOrderStatus(status: OrderStatus): string {
  return status.replace(/_/g, " ");
}
