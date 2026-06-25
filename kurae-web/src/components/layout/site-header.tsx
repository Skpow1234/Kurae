import Link from "next/link";

import { KuraeLogo } from "@/components/brand/kurae-logo";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSession } from "@/lib/auth/session";

export async function SiteHeader() {
  const session = await getSession();

  let accountHref = authUrl();
  let accountLabel = "Account";

  if (session?.role === "buyer") {
    accountHref = "/account/orders";
    accountLabel = session.name || "Account";
  } else if (session?.role === "seller") {
    accountHref = "/dashboard/settings";
    accountLabel = session.sellerName;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-sakura-petal/60 bg-sakura-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <KuraeLogo priority />
        <Link
          href={accountHref}
          className="max-w-[10rem] truncate text-sm font-medium text-sakura-dusk hover:text-sakura-bloom"
        >
          {accountLabel}
        </Link>
      </div>
    </header>
  );
}
