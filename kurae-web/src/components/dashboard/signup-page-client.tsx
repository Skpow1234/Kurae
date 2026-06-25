"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { slugify } from "@/lib/validation/drop";

type SignupPageClientProps = {
  variant?: "dashboard" | "storefront";
  defaultNext?: string;
};

function SignupForm({ variant, defaultNext }: SignupPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sellerName, setSellerName] = useState("");
  const [sellerSlug, setSellerSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = safeRedirectPath(searchParams.get("next"), defaultNext ?? "/dashboard/drops/new");
  const loginBase = variant === "storefront" ? "/login" : "/dashboard/login";
  const loginHref = `${loginBase}?next=${encodeURIComponent(next)}`;
  const isStorefront = variant === "storefront";

  function handleNameChange(name: string) {
    setSellerName(name);
    if (!slugTouched) setSellerSlug(slugify(name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint =
      variant === "storefront" ? "/api/auth/buyer/signup" : "/api/auth/signup";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        variant === "storefront"
          ? {
              email,
              password,
              name: sellerName.trim(),
            }
          : {
              email,
              password,
              sellerName: sellerName.trim(),
              sellerSlug: sellerSlug.trim() || slugify(sellerName),
            },
      ),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Sign up failed");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="sellerName" className="mb-1 block text-sm font-medium">
          {isStorefront ? "Your name" : "Brand name"}
        </label>
        <Input
          id="sellerName"
          value={sellerName}
          onChange={(e) => handleNameChange(e.target.value)}
          required
          autoComplete="name"
        />
      </div>
      {!isStorefront && (
        <div>
          <label htmlFor="sellerSlug" className="mb-1 block text-sm font-medium">
            Brand URL
          </label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-sakura-mist">kurae.com/</span>
            <Input
              id="sellerSlug"
              value={sellerSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSellerSlug(e.target.value);
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
          autoComplete="new-password"
          minLength={8}
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
        {loading ? "Creating…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-sakura-mist">
        Already have an account?{" "}
        <Link href={loginHref} className="text-sakura-dusk hover:underline">
          Sign in
        </Link>
      </p>
      {isStorefront && (
        <p className="text-center text-xs text-sakura-mist">
          Want to launch drops?{" "}
          <Link
            href={`/dashboard/signup?next=${encodeURIComponent("/dashboard/drops/new")}`}
            className="text-sakura-dusk hover:underline"
          >
            Create a seller account
          </Link>
        </p>
      )}
    </form>
  );
}

export function SignupPageClient({
  variant = "dashboard",
  defaultNext = "/dashboard/drops/new",
}: SignupPageClientProps) {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Create account</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          {variant === "storefront"
            ? "Create a buyer account to check out. Your cart is saved."
            : "Set up your seller brand on Kurae."}
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-sakura-mist">Loading…</p>}>
        <SignupForm variant={variant} defaultNext={defaultNext} />
      </Suspense>
    </div>
  );
}
