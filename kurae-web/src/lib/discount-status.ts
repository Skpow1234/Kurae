import type { DiscountCode } from "@/lib/types/discount";

export type DiscountDisplayStatus = "active" | "inactive" | "expired" | "depleted";

export function getDiscountDisplayStatus(
  code: DiscountCode,
  now = new Date(),
): DiscountDisplayStatus {
  if (!code.active) {
    return "inactive";
  }
  if (code.expiresAt && new Date(code.expiresAt) <= now) {
    return "expired";
  }
  if (code.maxUses != null && code.usesCount >= code.maxUses) {
    return "depleted";
  }
  return "active";
}

export function discountExpiresAtToInput(expiresAt?: string): string {
  if (!expiresAt) {
    return "";
  }
  return new Date(expiresAt).toISOString().slice(0, 10);
}

export function buildDiscountUpdatePayload(
  code: DiscountCode,
  overrides: Partial<{
    type: DiscountCode["type"];
    value: number;
    maxUses: number | null;
    expiresAt: string | null;
    dropId: string | null;
    active: boolean;
  }> = {},
) {
  const type = overrides.type ?? code.type;
  const value = overrides.value ?? code.value;
  const active = overrides.active ?? code.active;

  const payload: Record<string, unknown> = { type, value, active };

  if (overrides.maxUses !== undefined) {
    if (overrides.maxUses != null) {
      payload.maxUses = overrides.maxUses;
    }
  } else if (code.maxUses != null) {
    payload.maxUses = code.maxUses;
  }

  if (overrides.expiresAt !== undefined) {
    if (overrides.expiresAt) {
      payload.expiresAt = overrides.expiresAt;
    }
  } else if (code.expiresAt) {
    payload.expiresAt = discountExpiresAtToInput(code.expiresAt);
  }

  if (overrides.dropId !== undefined) {
    if (overrides.dropId) {
      payload.dropId = overrides.dropId;
    }
  } else if (code.dropId) {
    payload.dropId = code.dropId;
  }

  return payload;
}
