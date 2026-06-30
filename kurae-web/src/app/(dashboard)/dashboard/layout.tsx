import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { listSellerDrops } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { getStorefrontPreview } from "@/lib/storefront-preview";
import type { SellerDrop } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSellerSession();
  let dropsLoadFailed = false;
  let drops: SellerDrop[] = [];
  if (session) {
    try {
      drops = await listSellerDrops();
    } catch {
      dropsLoadFailed = true;
    }
  }
  const storefrontPreview = getStorefrontPreview(drops);

  return (
    <div className="min-h-screen bg-sakura-paper">
      <DashboardHeader session={session} storefrontPreview={storefrontPreview} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {dropsLoadFailed && (
          <ApiLoadError
            className="mb-6"
            message="Could not load drop preview data. Other dashboard pages may be unavailable."
          />
        )}
        {children}
      </main>
    </div>
  );
}
