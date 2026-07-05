"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { Button } from "@/components/ui/button";
import { authUrl } from "@/lib/auth/safe-redirect";
import { navItemsForRole } from "@/lib/dashboard-nav-filter";
import {
  dashboardMainNav,
  dashboardMoreNav,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";
import type { StorefrontPreview } from "@/lib/storefront-preview";
import type { SellerSession } from "@/lib/types";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  session: SellerSession | null;
  storefrontPreview: StorefrontPreview | null;
};

function navLinkClass(active: boolean, muted = false) {
  return cn(
    "transition-colors",
    active
      ? "font-medium text-sakura-dusk"
      : muted
        ? "text-sakura-mist hover:text-sakura-dusk"
        : "text-sakura-stone hover:text-sakura-dusk",
  );
}

export function DashboardHeader({
  session,
  storefrontPreview,
}: DashboardHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const teamRole = session?.teamRole ?? "owner";
  const mainNav = useMemo(
    () => navItemsForRole(dashboardMainNav, teamRole, "main"),
    [teamRole],
  );
  const moreNav = useMemo(
    () => navItemsForRole(dashboardMoreNav, teamRole, "more"),
    [teamRole],
  );

  function closeMenu() {
    setOpen(false);
  }

  return (
    <header className="border-b border-sakura-petal bg-sakura-paper">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="dashboard-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <span className="truncate text-sm font-semibold text-sakura-ink">
            Dashboard
          </span>
        </div>

        <nav
          className="hidden items-center gap-5 text-sm lg:flex"
          aria-label="Dashboard"
        >
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(isDashboardNavActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
          <span className="text-sakura-petal" aria-hidden>
            |
          </span>
          {moreNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(
                isDashboardNavActive(pathname, item.href),
                true,
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {session ? (
          <DashboardHeaderActions
            session={session}
            storefrontPreview={storefrontPreview}
          />
        ) : (
          <Link
            href={authUrl({ role: "seller", next: "/dashboard" })}
            className="text-sm text-sakura-mist hover:text-sakura-dusk"
          >
            Sign in
          </Link>
        )}
      </div>

      {open && (
        <nav
          id="dashboard-mobile-nav"
          className="border-t border-sakura-petal px-4 py-3 lg:hidden"
          aria-label="Dashboard"
        >
          <ul className="space-y-1 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-2 py-2",
                    navLinkClass(isDashboardNavActive(pathname, item.href)),
                  )}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <p className="px-2 pb-1 text-xs uppercase tracking-widest text-sakura-mist">
                More
              </p>
            </li>
            {moreNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-2 py-2",
                    navLinkClass(
                      isDashboardNavActive(pathname, item.href),
                      true,
                    ),
                  )}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {storefrontPreview && (
              <li className="border-t border-sakura-petal pt-2">
                <Link
                  href={storefrontPreview.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md px-2 py-2 text-sakura-mist hover:text-sakura-dusk"
                  onClick={closeMenu}
                >
                  View storefront
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}
