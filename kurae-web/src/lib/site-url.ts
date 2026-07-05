const DEV_SITE_DEFAULT = "http://localhost:3000";

export function getSiteUrl(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_SITE_DEFAULT;
  }

  return "";
}
