import type { CartLine } from "@/lib/types";

export function cartLineKey(
  line: Pick<CartLine, "dropId" | "productId" | "sizeId">,
): string {
  return `${line.dropId}:${line.productId}:${line.sizeId || "none"}`;
}

export function cartLineMatches(
  line: CartLine,
  match: {
    sellerSlug: string;
    dropSlug: string;
    productSlug?: string;
    sizeLabel: string;
  },
): boolean {
  return (
    line.sellerSlug === match.sellerSlug &&
    line.dropSlug === match.dropSlug &&
    (match.productSlug ? line.productSlug === match.productSlug : true) &&
    line.sizeLabel === match.sizeLabel
  );
}

/** Parse legacy cart keys: dropId:sizeId or dropId:productId:sizeId */
export function parseCartLineKey(key: string): {
  dropId: string;
  productId: string;
  sizeId: string;
} | null {
  const parts = key.split(":");
  if (parts.length === 2) {
    return { dropId: parts[0], productId: "", sizeId: parts[1] };
  }
  if (parts.length === 3) {
    return { dropId: parts[0], productId: parts[1], sizeId: parts[2] };
  }
  return null;
}
