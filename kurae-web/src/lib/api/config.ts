export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
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
