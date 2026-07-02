import type { CartLine } from "@/lib/types";

export function cartLineKey(line: Pick<CartLine, "dropId" | "sizeId">): string {
  return `${line.dropId}:${line.sizeId}`;
}

export function cartLineMatches(
  line: CartLine,
  match: { sellerSlug: string; dropSlug: string; sizeLabel: string },
): boolean {
  return (
    line.sellerSlug === match.sellerSlug &&
    line.dropSlug === match.dropSlug &&
    line.sizeLabel === match.sizeLabel
  );
}
