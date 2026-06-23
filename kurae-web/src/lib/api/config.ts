const DEV_API_DEFAULT = "http://localhost:8080";

export function getApiBase(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  // Local dev fallback so the app runs without .env.local
  if (process.env.NODE_ENV === "development") {
    return DEV_API_DEFAULT;
  }

  return "";
}

export function isApiConfigured(): boolean {
  return Boolean(getApiBase());
}

export function requireApiBase(): string {
  const base = getApiBase();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is required. Set it in .env.local (e.g. http://localhost:8080).",
    );
  }
  return base;
}
