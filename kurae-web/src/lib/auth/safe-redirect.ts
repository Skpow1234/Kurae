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

type AuthUrlOptions = {
  mode?: "signin" | "signup";
  role?: "buyer" | "seller";
  next?: string;
};

export function authUrl({
  mode = "signin",
  role = "buyer",
  next,
}: AuthUrlOptions = {}): string {
  const params = new URLSearchParams();
  if (mode === "signup") params.set("mode", "signup");
  if (role === "seller") params.set("role", "seller");
  if (next) params.set("next", next);
  const qs = params.toString();
  return qs ? `/login?${qs}` : "/login";
}

export function loginUrl(next: string): string {
  return authUrl({ role: "buyer", next });
}
