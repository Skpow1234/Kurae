"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@hana.studio");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    const next = searchParams.get("next") ?? "/dashboard";
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
      <p className="text-center text-xs text-sakura-mist">
        Demo: demo@hana.studio / demo1234 (after seed).
      </p>
    </form>
  );
}

export function LoginPageClient() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Sign in</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Seller accounts — session via secure cookie.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-sakura-mist">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-center text-sm text-sakura-mist">
        No account?{" "}
        <Link href="/dashboard/signup" className="text-sakura-dusk hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
