import { getPostHogClient } from "@/lib/analytics/posthog";

export type AnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

function cleanProperties(
  properties?: AnalyticsProperties,
): Record<string, string | number | boolean> | undefined {
  if (!properties) {
    return undefined;
  }
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function trackEvent(name: string, properties?: AnalyticsProperties): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }
  client.capture(name, cleanProperties(properties));
}

export function capturePageview(pathname: string, search: string): void {
  const client = getPostHogClient();
  if (!client || typeof window === "undefined") {
    return;
  }
  const url =
    window.location.origin +
    pathname +
    (search ? `?${search}` : "");
  client.capture("$pageview", { $current_url: url });
}

export function identifyUser(
  distinctId: string,
  properties?: AnalyticsProperties,
): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }
  client.identify(distinctId, cleanProperties(properties));
}

export function resetAnalyticsIdentity(): void {
  const client = getPostHogClient();
  if (!client) {
    return;
  }
  client.reset();
}
