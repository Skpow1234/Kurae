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
