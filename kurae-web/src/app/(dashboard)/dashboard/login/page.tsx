import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Sign in</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Seller accounts — session via kurae-api.
        </p>
      </div>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@brand.com" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <Input id="password" type="password" />
        </div>
        <Button type="button" className="w-full bg-sakura-dusk hover:bg-sakura-bloom">
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-sakura-mist">
        <Link href="/dashboard" className="hover:text-sakura-dusk">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
