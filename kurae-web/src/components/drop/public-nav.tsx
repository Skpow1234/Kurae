"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { shouldUnoptimizeImageSrc } from "@/lib/images";

type PublicNavProps = {
  sellerName: string;
  sellerLogoUrl?: string;
  dropTitle: string;
  cartCount?: number;
};

export function PublicNav({
  sellerName,
  sellerLogoUrl,
  dropTitle,
  cartCount = 0,
}: PublicNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-sakura-petal bg-sakura-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          {sellerLogoUrl ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-sakura-petal">
              <Image
                src={sellerLogoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="36px"
                unoptimized={shouldUnoptimizeImageSrc(sellerLogoUrl)}
              />
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-widest text-sakura-mist">
              {sellerName}
            </p>
            <p className="truncate text-sm font-semibold text-sakura-ink">
              {dropTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            className="relative hidden rounded-md p-2 hover:bg-sakura-surface sm:inline-flex"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="brand-accent-badge absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-sakura-ink">
                {cartCount}
              </span>
            )}
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-sakura-petal px-4 py-3 sm:hidden">
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/checkout" className="block py-2" onClick={() => setOpen(false)}>
                Cart {cartCount > 0 ? `(${cartCount})` : ""}
              </Link>
            </li>
            <li>
              <a href="#waitlist" className="block py-2" onClick={() => setOpen(false)}>
                Waitlist
              </a>
            </li>
            <li>
              <a href="#story" className="block py-2" onClick={() => setOpen(false)}>
                Story
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
