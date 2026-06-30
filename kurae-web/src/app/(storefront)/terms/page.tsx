import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Kurae as a buyer or seller.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-sakura-ink">Terms of Service</h1>
      <p className="mt-2 text-sm text-sakura-mist">Last updated: June 2026</p>

      <div className="prose-sakura mt-8 space-y-4 text-sm leading-relaxed text-sakura-stone">
        <p>
          By using Kurae, you agree to these terms. Sellers are responsible for
          their drop listings, inventory, fulfillment, refunds, and compliance
          with applicable laws.
        </p>
        <p>
          Buyers purchase directly from sellers through Kurae checkout. All sales
          are subject to the drop&apos;s stated price, size, and availability at
          checkout time.
        </p>
        <p>
          Limited inventory and countdown windows are enforced automatically.
          Completed payments are final unless the seller issues a refund through
          their dashboard.
        </p>
        <p>
          Kurae provides the platform as-is during its beta period. We may update
          these terms as the product evolves.
        </p>
      </div>

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-sakura-dusk hover:underline"
      >
        ← Back to Kurae
      </Link>
    </main>
  );
}
