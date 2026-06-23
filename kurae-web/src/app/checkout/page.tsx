import Link from "next/link";

import { Button } from "@/components/ui/button";
import { demoDropLive } from "@/lib/mock/drops";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const drop = demoDropLive;

  return (
    <main className="min-h-screen bg-sakura-paper">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/hana-studio/sakura-hoodie" className="text-sm text-sakura-mist hover:text-sakura-ink">
            ← Back
          </Link>
          <p className="text-sm font-medium text-sakura-ink">Checkout</p>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
        <section className="rounded-lg border border-border bg-sakura-surface p-4">
          <h1 className="font-semibold text-sakura-ink">{drop.title}</h1>
          <p className="mt-1 text-sm text-sakura-mist">Size M</p>
          <p className="mt-3 font-mono text-lg font-semibold">
            {formatPrice(drop.priceCents, drop.currency)}
          </p>
        </section>

        <p className="text-sm font-medium text-sakura-warning">
          Limited units — complete checkout to secure yours.{" "}
          <span className="font-mono text-sakura-dusk">
            {drop.inventoryRemaining} left
          </span>
        </p>

        <section className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm text-sakura-mist">
            Stripe checkout will mount here when kurae-api is connected.
          </p>
          <Button className="w-full" size="lg" disabled>
            Pay with Stripe
          </Button>
        </section>
      </div>
    </main>
  );
}
