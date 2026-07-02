import { redirect } from "next/navigation";

import { BrandingForm } from "@/components/dashboard/branding-form";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { getSellerBranding } from "@/lib/api/branding-server";
import { listSellerDrops } from "@/lib/api/drops-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";
import { getStorefrontPreview } from "@/lib/storefront-preview";

export default async function BrandingPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/branding" }));

  let brandingData;
  try {
    brandingData = await Promise.all([getSellerBranding(), listSellerDrops()]);
  } catch {
    return (
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">Branding</h1>
        </div>
        <ApiLoadError message="Could not load branding. Check that kurae-api is running." />
      </div>
    );
  }

  const [branding, drops] = brandingData;
  const published = drops.filter((drop) => drop.publishStatus === "published");
  const storefrontPreview = getStorefrontPreview(
    session.sellerSlug,
    published.length > 0 ? published : drops,
  );

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Branding</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Logo, accent color, and bio appear on your public storefront and drop pages —
          not the Kurae home or dashboard.
        </p>
      </div>

      <BrandingForm
        initial={branding}
        sellerName={session.sellerName}
        storefrontPreview={storefrontPreview}
      />
    </div>
  );
}
