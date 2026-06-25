"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { CartLine, PublicDrop } from "@/lib/types";

const STORAGE_KEY = "kurae_cart";

type CartContextValue = {
  line: CartLine | null;
  addItem: (drop: PublicDrop, sizeId: string) => void;
  clear: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLine | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine) : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [line, setLine] = useState<CartLine | null>(() => readStorage());

  const persist = useCallback((next: CartLine | null) => {
    setLine(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const addItem = useCallback(
    (drop: PublicDrop, sizeId: string) => {
      const size = drop.sizes.find((s) => s.id === sizeId);
      if (!size) return;

      persist({
        dropId: drop.id,
        sellerSlug: drop.sellerSlug,
        dropSlug: drop.slug,
        dropTitle: drop.title,
        sizeId,
        sizeLabel: size.label,
        priceCents: drop.priceCents,
        currency: drop.currency,
        heroImageUrl: drop.heroImageUrl,
      });
    },
    [persist],
  );

  const clear = useCallback(() => persist(null), [persist]);

  const value = useMemo(
    () => ({
      line,
      addItem,
      clear,
      count: line ? 1 : 0,
    }),
    [line, addItem, clear],
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
