"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/validation/drop";

export function SignupPageClient() {
  const router = useRouter();
  const [sellerName, setSellerName] = useState("");
  const [sellerSlug, setSellerSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(name: string) {
    setSellerName(name);
    if (!slugTouched) setSellerSlug(slugify(name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, sellerName, sellerSlug }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Sign up failed");
      return;
    }

    router.push("/dashboard/drops/new");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Create account</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Set up your seller brand on Kurae.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sellerName" className="mb-1 block text-sm font-medium">
            Brand name
          </label>
          <Input
            id="sellerName"
            value={sellerName}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>
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
          {loading ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-sakura-mist">
        Already have an account?{" "}
        <Link href="/dashboard/login" className="text-sakura-dusk hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
