export default function CheckoutPendingLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md text-center" aria-busy="true" aria-label="Loading">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-sakura-petal brand-accent-spinner" />
        <p className="text-sm text-sakura-mist">Loading payment status…</p>
      </div>
    </main>
  );
}
