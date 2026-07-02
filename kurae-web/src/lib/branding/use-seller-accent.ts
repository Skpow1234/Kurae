"use client";

import { useEffect, useState } from "react";

import type { BrandAccent } from "@/lib/types";

export function useSellerAccent(sellerSlug?: string, dropSlug?: string) {
  const [accent, setAccent] = useState<BrandAccent | undefined>();

  useEffect(() => {
    if (!sellerSlug) return;

    let cancelled = false;

    async function load() {
      try {
        if (dropSlug) {
          const res = await fetch(`/api/public/${sellerSlug}/${dropSlug}`);
          if (!res.ok) return;
          const data = (await res.json()) as { drop?: { sellerAccent?: BrandAccent } };
          if (!cancelled) {
            setAccent(data.drop?.sellerAccent);
          }
          return;
        }

        const res = await fetch(`/api/public/sellers/${sellerSlug}`);
        if (!res.ok) return;
        const data = (await res.json()) as { seller?: { accent?: BrandAccent } };
        if (!cancelled) {
          setAccent(data.seller?.accent);
        }
      } catch {
        // Optional polish — default preset applies when accent is missing
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [dropSlug, sellerSlug]);

  return accent;
}
