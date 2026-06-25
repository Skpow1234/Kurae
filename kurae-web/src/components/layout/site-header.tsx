import Link from "next/link";

import { KuraeLogo } from "@/components/brand/kurae-logo";
import { authUrl } from "@/lib/auth/safe-redirect";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-sakura-petal/60 bg-sakura-paper/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <KuraeLogo priority />
        <Link
          href={authUrl()}
          className="text-sm font-medium text-sakura-dusk hover:text-sakura-bloom"
        >
          Account
        </Link>
      </div>
    </header>
  );
}
