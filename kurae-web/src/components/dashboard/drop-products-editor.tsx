"use client";

import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_DROP_SIZES } from "@/lib/constants/sizes";
import { shouldUnoptimizeImageSrc } from "@/lib/images";
import { uploadProductImage } from "@/lib/uploads/product-image";
import type { DropProductFormValues, DropSize, SellerDrop } from "@/lib/types";
import { slugify } from "@/lib/validation/drop";

type DropProductsEditorProps = {
  products: DropProductFormValues[];
  onChange: (products: DropProductFormValues[]) => void;
};

function emptyProduct(index: number): DropProductFormValues {
  return {
    slug: index === 0 ? "default" : "",
    name: "",
    description: "",
    priceDollars: "",
    inventory: "25",
    imageUrl: "",
    sizes: DEFAULT_DROP_SIZES.map((size) => ({ ...size })),
  };
}

export function DropProductsEditor({ products, onChange }: DropProductsEditorProps) {
  function updateProduct(index: number, patch: Partial<DropProductFormValues>) {
    onChange(
      products.map((product, i) =>
        i === index ? { ...product, ...patch } : product,
      ),
    );
  }

  function toggleSize(productIndex: number, sizeId: string) {
    onChange(
      products.map((product, index) => {
        if (index !== productIndex) return product;
        return {
          ...product,
          sizes: product.sizes.map((size) =>
            size.id === sizeId ? { ...size, available: !size.available } : size,
          ),
        };
      }),
    );
  }

  async function uploadImage(index: number, file: File | null) {
    if (!file) return;
    const url = await uploadProductImage(file);
    updateProduct(index, { imageUrl: url });
  }

  return (
    <fieldset className="space-y-4 rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
      <legend className="px-1 text-sm font-medium text-sakura-ink">
        Products
      </legend>
      <p className="text-sm text-sakura-mist">
        Each product has its own price, inventory, and sizes.
      </p>

      <div className="space-y-6">
        {products.map((product, index) => (
          <div
            key={product.id ?? `product-${index}`}
            className="space-y-4 rounded-md border border-sakura-petal bg-sakura-paper/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-sakura-ink">
                Product {index + 1}
              </h3>
              {products.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-sakura-warning"
                  onClick={() =>
                    onChange(products.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-sakura-stone">Name</span>
                <Input
                  value={product.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    updateProduct(index, {
                      name,
                      slug:
                        index > 0 && !product.slug
                          ? slugify(name)
                          : product.slug,
                    });
                  }}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm">
                <span className="text-sakura-stone">Slug</span>
                <Input
                  value={product.slug}
                  onChange={(e) =>
                    updateProduct(index, { slug: slugify(e.target.value) })
                  }
                  className="mt-1 font-mono"
                />
              </label>
              <label className="block text-sm">
                <span className="text-sakura-stone">Price (USD)</span>
                <Input
                  value={product.priceDollars}
                  onChange={(e) =>
                    updateProduct(index, { priceDollars: e.target.value })
                  }
                  className="mt-1 font-mono"
                />
              </label>
              <label className="block text-sm">
                <span className="text-sakura-stone">Inventory</span>
                <Input
                  value={product.inventory}
                  onChange={(e) =>
                    updateProduct(index, { inventory: e.target.value })
                  }
                  className="mt-1 font-mono"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="text-sakura-stone">Product image</span>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => uploadImage(index, e.target.files?.[0] ?? null)}
              />
              {product.imageUrl && (
                <div className="relative mt-2 h-24 w-20 overflow-hidden rounded bg-sakura-surface">
                  <Image
                    src={product.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={shouldUnoptimizeImageSrc(product.imageUrl)}
                  />
                </div>
              )}
            </label>

            <div>
              <p className="text-sm text-sakura-stone">Sizes</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {product.sizes.map((size) => (
                  <label
                    key={size.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={size.available}
                      onChange={() => toggleSize(index, size.id)}
                      className="rounded border-sakura-petal text-sakura-blush focus:ring-sakura-bloom"
                    />
                    <span className="font-medium text-sakura-ink">
                      {size.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => onChange([...products, emptyProduct(products.length)])}
      >
        Add another product
      </Button>
    </fieldset>
  );
}

export function productsToFormValues(drop: SellerDrop): DropProductFormValues[] {
  if (drop.products?.length) {
    return drop.products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceDollars: (product.priceCents / 100).toFixed(2),
      inventory: String(product.inventoryTotal),
      imageUrl: product.imageUrl,
      sizes: product.sizes.map((size) => ({ ...size })),
    }));
  }

  return [
    {
      slug: "default",
      name: drop.title,
      description: drop.description,
      priceDollars: (drop.priceCents / 100).toFixed(2),
      inventory: String(drop.inventoryTotal),
      imageUrl: drop.heroImageUrl,
      sizes: drop.sizes.map((size) => ({ ...size })),
    },
  ];
}

export function productsPayload(values: {
  title: string;
  products: DropProductFormValues[];
}): Array<{
  id?: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  inventoryTotal: number;
  sizes: DropSize[];
}> {
  return values.products.map((product, index) => ({
    id: product.id,
    slug: product.slug.trim() || (index === 0 ? "default" : slugify(product.name)),
    name: product.name.trim() || values.title.trim(),
    description: product.description.trim(),
    priceCents: Math.round(parseFloat(product.priceDollars || "0") * 100),
    imageUrl: product.imageUrl.trim(),
    inventoryTotal: parseInt(product.inventory || "0", 10),
    sizes: product.sizes,
  }));
}
