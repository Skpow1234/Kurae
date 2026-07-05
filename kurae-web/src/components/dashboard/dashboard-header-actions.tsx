"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { StorefrontPreview } from "@/lib/storefront-preview";
import { authUrl } from "@/lib/auth/safe-redirect";
import { teamRoleLabel } from "@/lib/team-permissions";
import type { SellerSession } from "@/lib/types";

type DashboardHeaderActionsProps = {
  session: SellerSession;
  storefrontPreview: StorefrontPreview | null;
};

export function DashboardHeaderActions({
  session,
  storefrontPreview,
}: DashboardHeaderActionsProps) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(authUrl({ role: "seller", next: "/dashboard" }));
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <span className="hidden text-sm text-sakura-mist sm:inline">
        {session.memberName ?? session.sellerName}
        {session.teamRole !== "owner" && (
          <span className="ml-1 text-xs text-sakura-stone">
            ({teamRoleLabel(session.teamRole)})
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-sm text-sakura-dusk hover:text-sakura-ink"
      >
        Sign out
      </button>
      {storefrontPreview && (
        <Link
          href={storefrontPreview.href}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden text-sm text-sakura-mist hover:text-sakura-dusk sm:inline"
        >
          View storefront
        </Link>
      )}
    </div>
  );
}
