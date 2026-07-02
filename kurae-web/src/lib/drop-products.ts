import type { DropProduct, PublicDrop } from "@/lib/types";

export function resolveDropProducts(drop: PublicDrop): DropProduct[] {
  if (drop.products?.length) {
    return drop.products;
  }

  return [
    {
      id: `${drop.id}-legacy`,
      slug: "default",
      name: drop.title,
      description: drop.description,
      priceCents: drop.priceCents,
      imageUrl: drop.heroImageUrl,
      sortOrder: 0,
      inventoryTotal: drop.inventoryTotal,
      inventoryRemaining: drop.inventoryRemaining,
      sizes: drop.sizes,
    },
  ];
}

export function findDropProduct(
  drop: PublicDrop,
  productId: string,
): DropProduct | undefined {
  return resolveDropProducts(drop).find((product) => product.id === productId);
}

export function productRequiresSize(product: DropProduct): boolean {
  return product.sizes.some((size) => size.available);
}
