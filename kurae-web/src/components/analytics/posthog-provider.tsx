"use client";

import { PostHogProvider as PHProvider } from "posthog-js/react";
import { Suspense, useEffect, useState } from "react";

import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import {
  getPostHogClient,
  getPostHogConfig,
  initPostHog,
} from "@/lib/analytics/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ReturnType<typeof getPostHogClient>>(null);

  useEffect(() => {
    setClient(initPostHog());
  }, []);

  if (!getPostHogConfig() || !client) {
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
