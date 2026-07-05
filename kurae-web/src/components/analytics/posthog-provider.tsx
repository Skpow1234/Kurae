"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense } from "react";

import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import { getPostHogConfig, initPostHog } from "@/lib/analytics/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const cfg = getPostHogConfig();
  if (!cfg) {
    return <>{children}</>;
  }

  const client = initPostHog();
  if (!client) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={client}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
