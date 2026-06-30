import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Kurae handles buyer and seller data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-sakura-ink">Privacy Policy</h1>
      <p className="mt-2 text-sm text-sakura-mist">Last updated: June 2026</p>

      <div className="prose-sakura mt-8 space-y-4 text-sm leading-relaxed text-sakura-stone">
        <p>
          Kurae helps sellers run limited drops and helps buyers purchase those
          drops. We collect account email, order details, and usage data needed
          to operate checkout, waitlists, and seller dashboards.
        </p>
        <p>
          Payment card data is processed by Stripe. Kurae does not store full card
          numbers on our servers.
        </p>
        <p>
          We use your email to send order receipts, waitlist notifications, and
          account-related messages. Sellers can see buyer email addresses for orders
          on their drops.
        </p>
        <p>
          For privacy questions, contact your seller directly for order-specific
          requests, or reach the platform operator through your Kurae account
          settings.
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
