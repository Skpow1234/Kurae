import { redirect } from "next/navigation";

import { BrandingForm } from "@/components/dashboard/branding-form";
import { getSellerBranding } from "@/lib/api/branding-server";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getSellerSession } from "@/lib/auth/session";

export default async function BrandingPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard/branding" }));

  const branding = await getSellerBranding();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Branding</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Logo, accent color, and bio appear on your public drop pages — not the Kurae home
          or dashboard.
        </p>
      </div>

      <BrandingForm initial={branding} sellerName={session.sellerName} />
    </div>
  );
}
