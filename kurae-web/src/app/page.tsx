import Link from "next/link";

const demos = [
  { href: "/hana-studio/sakura-hoodie", label: "Live drop", tone: "primary" },
  { href: "/hana-studio/sakura-tee", label: "Upcoming", tone: "secondary" },
  { href: "/hana-studio/sakura-cap", label: "Sold out", tone: "secondary" },
  { href: "/hana-studio/winter-bloom", label: "Expired", tone: "secondary" },
] as const;

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-sakura-petal/40 to-sakura-paper px-4">
      <div className="max-w-lg text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-sakura-bloom">
          Kurae
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-sakura-ink">
          Limited drops, done right
        </h1>
        <p className="mt-4 text-sakura-stone">
          Small batches. Timeless Japanese style.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {demos.map((demo) => (
            <Link
              key={demo.href}
              href={demo.href}
              className={
                demo.tone === "primary"
                  ? "inline-flex h-10 items-center justify-center rounded-md bg-sakura-blush px-4 text-sm font-medium text-sakura-ink hover:bg-sakura-bloom"
                  : "inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper px-4 text-sm font-medium hover:bg-sakura-surface"
              }
            >
              {demo.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-sakura-dusk hover:bg-sakura-surface"
          >
            Seller dashboard
          </Link>
          <Link
            href="/dashboard/signup"
            className="inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal px-4 text-sm font-medium hover:bg-sakura-surface"
          >
            Create seller account
          </Link>
        </div>
      </div>
    </main>
  );
}
