/** Allow only same-origin relative paths (no protocol-relative URLs). */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback: string,
): string {
  if (!next) return fallback;
  const path = next.trim();
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
