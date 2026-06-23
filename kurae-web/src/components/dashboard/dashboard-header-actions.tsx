"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SellerSession } from "@/lib/types";

type DashboardHeaderActionsProps = {
  session: SellerSession;
};

export function DashboardHeaderActions({ session }: DashboardHeaderActionsProps) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <span className="hidden text-sm text-sakura-mist sm:inline">
        {session.sellerName}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-sm text-sakura-dusk hover:text-sakura-ink"
      >
        Sign out
      </button>
      <Link
        href={`/${session.sellerSlug}/sakura-hoodie`}
        className="hidden text-sm text-sakura-mist hover:text-sakura-dusk sm:inline"
      >
        View storefront
      </Link>
    </div>
  );
}
