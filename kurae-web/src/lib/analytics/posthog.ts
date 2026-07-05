import posthog from "posthog-js";

let initialized = false;

export type PostHogConfig = {
  key: string;
  host: string;
};

export function getPostHogConfig(): PostHogConfig | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) {
    return null;
  }
  return {
    key,
    host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() ||
      "https://us.i.posthog.com",
  };
}

export function isPostHogConfigured(): boolean {
  return getPostHogConfig() !== null;
}

export function initPostHog(): typeof posthog | null {
  if (typeof window === "undefined") {
    return null;
  }
  const cfg = getPostHogConfig();
  if (!cfg) {
    return null;
  }
  if (!initialized) {
    posthog.init(cfg.key, {
      api_host: cfg.host,
      person_profiles: "identified_only",
      capture_pageview: false,
      capture_pageleave: true,
    });
    initialized = true;
  }
  return posthog;
}

export function getPostHogClient(): typeof posthog | null {
  return initPostHog();
}
