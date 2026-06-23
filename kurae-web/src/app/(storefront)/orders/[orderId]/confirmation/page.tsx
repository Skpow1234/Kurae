import Link from "next/link";

import { getMockDrop } from "@/lib/mock/drops";
import { formatPrice } from "@/lib/utils";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ drop?: string }>;
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: PageProps) {
  const { orderId } = await params;
  const { drop: dropSlug = "sakura-hoodie" } = await searchParams;
  const drop = getMockDrop("hana-studio", dropSlug);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md rounded-lg border border-sakura-petal bg-sakura-surface p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-sakura-bloom">
          Order confirmed
        </p>
        <h1 className="mt-2 text-2xl font-bold text-sakura-ink">
          You&apos;re in.
        </h1>
        <p className="mt-2 text-sm text-sakura-stone">
          Payment received. We&apos;ll email your receipt shortly.
        </p>

        {drop && (
          <div className="mt-6 rounded-md bg-sakura-petal/50 p-4 text-left text-sm">
            <p className="font-medium text-sakura-ink">{drop.title}</p>
            <p className="mt-1 font-mono text-sakura-dusk">
              {formatPrice(drop.priceCents, drop.currency)}
            </p>
          </div>
        )}

        <p className="mt-4 font-mono text-xs text-sakura-mist">{orderId}</p>

        <Link
          href={`/hana-studio/${dropSlug}`}
          className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-sakura-blush px-6 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
        >
          Back to drop
        </Link>
      </div>
    </main>
  );
}
