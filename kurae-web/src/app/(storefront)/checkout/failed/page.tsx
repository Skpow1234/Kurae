import NextLink from "next/link";

type PageProps = {
  searchParams: Promise<{ drop?: string; size?: string }>;
};

export default async function CheckoutFailedPage({ searchParams }: PageProps) {
  const { drop = "sakura-hoodie", size = "M" } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md rounded-lg border border-sakura-petal bg-sakura-surface p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-sakura-warning">
          Payment failed
        </p>
        <h1 className="mt-2 text-2xl font-bold text-sakura-ink">
          Couldn&apos;t complete payment
        </h1>
        <p className="mt-2 text-sm text-sakura-stone">
          Your card was declined or the session expired. Your unit has not been
          reserved.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <NextLink
            href="/checkout"
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-sakura-blush text-base font-medium text-sakura-ink hover:bg-sakura-bloom"
          >
            Try again
          </NextLink>
          <NextLink
            href={`/hana-studio/${drop}#purchase`}
            className="text-sm text-sakura-dusk hover:underline"
          >
            Back to drop
          </NextLink>
        </div>
      </div>
    </main>
  );
}
