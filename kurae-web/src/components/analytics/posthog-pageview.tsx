"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { capturePageview } from "@/lib/analytics/track";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }
    capturePageview(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  return null;
}
