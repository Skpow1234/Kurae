import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sakura-paper px-4">
      <div className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-sakura-mist">
          Kurae
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-sakura-ink">
          Limited drops, done right
        </h1>
        <p className="mt-4 text-sakura-stone">
          Japanese-inspired streetwear commerce. Preview the demo drop page or
          open the seller dashboard.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/hana-studio/sakura-hoodie"
            className="inline-flex h-10 items-center justify-center rounded-md bg-sakura-ink px-4 text-sm font-medium text-sakura-paper hover:bg-sakura-stone"
          >
            Live drop demo
          </Link>
          <Link
            href="/hana-studio/sakura-tee"
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium hover:bg-sakura-surface"
          >
            Upcoming drop demo
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-sakura-surface"
          >
            Seller dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
