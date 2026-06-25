"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";

type LoginPageClientProps = {
  variant?: "dashboard" | "storefront";
  defaultNext?: string;
};

function LoginForm({ variant, defaultNext }: LoginPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = safeRedirectPath(searchParams.get("next"), defaultNext ?? "/dashboard");
  const signupBase = variant === "storefront" ? "/signup" : "/dashboard/signup";
  const signupHref = `${signupBase}?next=${encodeURIComponent(next)}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Sign in failed");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
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
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      {variant === "dashboard" && (
        <p className="text-center text-xs text-sakura-mist">
          Demo: demo@hana.studio / demo1234 (after seed).
        </p>
      )}
      <p className="text-center text-sm text-sakura-mist">
        No account?{" "}
        <Link href={signupHref} className="text-sakura-dusk hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}

export function LoginPageClient({
  variant = "dashboard",
  defaultNext = "/dashboard",
}: LoginPageClientProps) {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Sign in</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          {variant === "storefront"
            ? "Sign in to complete your purchase."
            : "Seller accounts — session via secure cookie."}
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-sakura-mist">Loading…</p>}>
        <LoginForm variant={variant} defaultNext={defaultNext} />
      </Suspense>
    </div>
  );
}
