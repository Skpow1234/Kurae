"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authUrl, safeRedirectPath } from "@/lib/auth/safe-redirect";
import { slugify } from "@/lib/validation/drop";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";
type AuthRole = "buyer" | "seller";

function roleFromParams(
  roleParam: string | null,
  next: string | null,
): AuthRole {
  if (roleParam === "seller" || roleParam === "buyer") return roleParam;
  if (next?.startsWith("/dashboard")) return "seller";
  if (next === "/checkout" || next?.startsWith("/checkout")) return "buyer";
  return "buyer";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const initialMode: AuthMode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";
  const initialRole = roleFromParams(searchParams.get("role"), nextParam);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AuthRole>(initialRole);
  const [name, setName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const defaultNext = role === "seller" ? "/dashboard" : "/";
  const next = useMemo(
    () => safeRedirectPath(nextParam, defaultNext),
    [nextParam, defaultNext],
  );

  function syncUrl(nextMode: AuthMode, nextRole: AuthRole) {
    const url = authUrl({ mode: nextMode, role: nextRole, next });
    router.replace(url, { scroll: false });
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    syncUrl(nextMode, role);
  }

  function handleRoleChange(nextRole: AuthRole) {
    setRole(nextRole);
    setError(null);
    syncUrl(mode, nextRole);
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setBrandSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isSignup = mode === "signup";
    const endpoint = isSignup
      ? role === "seller"
        ? "/api/auth/signup"
        : "/api/auth/buyer/signup"
      : role === "seller"
        ? "/api/auth/login"
        : "/api/auth/buyer/login";

    const body =
      isSignup && role === "seller"
        ? {
            email,
            password,
            sellerName: name.trim(),
            sellerSlug: brandSlug.trim() || slugify(name),
          }
        : isSignup
          ? { email, password, name: name.trim() }
          : { email, password };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? (isSignup ? "Sign up failed" : "Sign in failed"));
      return;
    }

    router.push(next);
    router.refresh();
  }

  const isSeller = role === "seller";
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-sakura-ink">
          {isSignup ? "Create account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-sakura-mist">
          {isSeller
            ? "Seller account — launch and manage drops."
            : "Buyer account — browse and check out."}
        </p>
      </div>

      <div className="flex rounded-lg border border-sakura-petal bg-sakura-surface p-1">
        <button
          type="button"
          onClick={() => handleModeChange("signin")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signin"
              ? "bg-sakura-paper text-sakura-ink shadow-sm"
              : "text-sakura-mist hover:text-sakura-dusk",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("signup")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            mode === "signup"
              ? "bg-sakura-paper text-sakura-ink shadow-sm"
              : "text-sakura-mist hover:text-sakura-dusk",
          )}
        >
          Create account
        </button>
      </div>

      <div className="flex rounded-lg border border-sakura-petal bg-sakura-surface p-1">
        <button
          type="button"
          onClick={() => handleRoleChange("buyer")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            role === "buyer"
              ? "bg-sakura-paper text-sakura-ink shadow-sm"
              : "text-sakura-mist hover:text-sakura-dusk",
          )}
        >
          Buyer
        </button>
        <button
          type="button"
          onClick={() => handleRoleChange("seller")}
          className={cn(
            "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
            role === "seller"
              ? "bg-sakura-paper text-sakura-ink shadow-sm"
              : "text-sakura-mist hover:text-sakura-dusk",
          )}
        >
          Seller
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isSignup && (
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              {isSeller ? "Brand name" : "Your name"}
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        )}

        {isSignup && isSeller && (
          <div>
            <label htmlFor="brandSlug" className="mb-1 block text-sm font-medium">
              Brand URL
            </label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-sakura-mist">kurae.com/</span>
              <Input
                id="brandSlug"
                value={brandSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setBrandSlug(e.target.value);
                }}
                required
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
          />
        </div>

        {error && (
          <p className="text-sm text-sakura-warning" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-sakura-dusk hover:bg-sakura-bloom"
          disabled={loading}
        >
          {loading
            ? isSignup
              ? "Creating…"
              : "Signing in…"
            : isSignup
              ? "Create account"
              : "Sign in"}
        </Button>

        {isSeller && mode === "signin" && (
          <p className="text-center text-xs text-sakura-mist">
            Demo seller: demo@hana.studio / demo1234 (after seed).
          </p>
        )}
      </form>
    </div>
  );
}

export function AuthPageClient() {
  return (
    <Suspense fallback={<p className="text-sm text-sakura-mist">Loading…</p>}>
      <AuthForm />
    </Suspense>
  );
}
