"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cartLineKey, cartLineMatches } from "@/lib/cart/keys";
import { findDropProduct, productRequiresSize, resolveDropProducts } from "@/lib/drop-products";
import type { CartLine, PublicDrop } from "@/lib/types";

const STORAGE_KEY = "kurae_cart";

type CartContextValue = {
  lines: CartLine[];
  /** @deprecated Use `lines` — first line for backward compatibility */
  line: CartLine | null;
  addItem: (drop: PublicDrop, productId: string, sizeId: string) => string | null;
  removeItem: (key: string) => void;
  removeMatching: (match: {
    sellerSlug: string;
    dropSlug: string;
    productSlug?: string;
    sizeLabel: string;
  }) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function normalizeLine(raw: CartLine): CartLine | null {
  if (!raw.dropId) return null;
  return {
    ...raw,
    productId: raw.productId ?? "",
    productName: raw.productName ?? raw.dropTitle,
    productSlug: raw.productSlug ?? "default",
    sizeId: raw.sizeId ?? "",
    sizeLabel: raw.sizeLabel ?? "",
  };
}

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const lines = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          "lines" in parsed &&
          Array.isArray((parsed as { lines: unknown }).lines)
        ? (parsed as { lines: CartLine[] }).lines
        : parsed && typeof parsed === "object" && "dropId" in parsed
          ? [parsed as CartLine]
          : [];
    return lines
      .map((line) => normalizeLine(line as CartLine))
      .filter((line): line is CartLine => line !== null);
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  if (lines.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readStorage());

  const persist = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = updater(prev);
      writeStorage(next);
      return next;
    });
  }, []);

  const addItem = useCallback(
    (drop: PublicDrop, productId: string, sizeId: string): string | null => {
      const product =
        findDropProduct(drop, productId) ?? resolveDropProducts(drop)[0];
      if (!product) return null;

      let sizeLabel = "";
      if (productRequiresSize(product)) {
        const size = product.sizes.find((entry) => entry.id === sizeId);
        if (!size?.available) return null;
        sizeLabel = size.label;
      }

      const nextLine: CartLine = {
        dropId: drop.id,
        sellerSlug: drop.sellerSlug,
        dropSlug: drop.slug,
        dropTitle: drop.title,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        sizeId: sizeId || "none",
        sizeLabel,
        priceCents: product.priceCents,
        currency: drop.currency,
        heroImageUrl: product.imageUrl || drop.heroImageUrl,
      };

      const key = cartLineKey(nextLine);
      persist((prev) => [
        ...prev.filter((line) => cartLineKey(line) !== key),
        nextLine,
      ]);
      return key;
    },
    [persist],
  );

  const removeItem = useCallback(
    (key: string) => {
      persist((prev) => prev.filter((line) => cartLineKey(line) !== key));
    },
    [persist],
  );

  const removeMatching = useCallback(
    (match: {
      sellerSlug: string;
      dropSlug: string;
      productSlug?: string;
      sizeLabel: string;
    }) => {
      persist((prev) => prev.filter((line) => !cartLineMatches(line, match)));
    },
    [persist],
  );

  const clear = useCallback(() => persist(() => []), [persist]);

  const value = useMemo(
    () => ({
      lines,
      line: lines[0] ?? null,
      addItem,
      removeItem,
      removeMatching,
      clear,
      count: lines.length,
    }),
    [lines, addItem, removeItem, removeMatching, clear],
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
