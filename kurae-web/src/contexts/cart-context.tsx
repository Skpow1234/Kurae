"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cartLineKey, cartLineMatches } from "@/lib/cart/keys";
import type { CartLine, PublicDrop } from "@/lib/types";

const STORAGE_KEY = "kurae_cart";

type CartContextValue = {
  lines: CartLine[];
  /** @deprecated Use `lines` — first line for backward compatibility */
  line: CartLine | null;
  addItem: (drop: PublicDrop, sizeId: string) => string | null;
  removeItem: (key: string) => void;
  removeMatching: (match: {
    sellerSlug: string;
    dropSlug: string;
    sizeLabel: string;
  }) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as CartLine[];
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "lines" in parsed &&
      Array.isArray((parsed as { lines: unknown }).lines)
    ) {
      return (parsed as { lines: CartLine[] }).lines;
    }
    if (parsed && typeof parsed === "object" && "dropId" in parsed) {
      return [parsed as CartLine];
    }
    return [];
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
    (drop: PublicDrop, sizeId: string): string | null => {
      const size = drop.sizes.find((s) => s.id === sizeId);
      if (!size) return null;

      const nextLine: CartLine = {
        dropId: drop.id,
        sellerSlug: drop.sellerSlug,
        dropSlug: drop.slug,
        dropTitle: drop.title,
        sizeId,
        sizeLabel: size.label,
        priceCents: drop.priceCents,
        currency: drop.currency,
        heroImageUrl: drop.heroImageUrl,
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
    (match: { sellerSlug: string; dropSlug: string; sizeLabel: string }) => {
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
