import Link from "next/link";

export default function DropNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-sakura-paper px-4 text-center">
      <h1 className="text-2xl font-bold text-sakura-ink">Drop not found</h1>
      <p className="mt-2 text-sakura-mist">
        This drop doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-sakura-dusk underline-offset-4 hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
