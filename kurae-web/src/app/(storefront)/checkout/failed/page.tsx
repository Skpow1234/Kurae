import NextLink from "next/link";

import { SellerBrandTheme } from "@/components/branding/seller-brand-theme";
import {
  getCheckoutFailureContent,
  normalizeFailureReason,
} from "@/lib/checkout-failure";
import { fetchPublicSeller } from "@/lib/api/drops-server";
import { brandCtaLinkLgClass } from "@/lib/branding/cta";

type PageProps = {
  searchParams: Promise<{
    reason?: string;
    seller?: string;
    drop?: string;
    size?: string;
    order?: string;
    message?: string;
  }>;
};

export default async function CheckoutFailedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const reason = normalizeFailureReason(params.reason);

  const content = getCheckoutFailureContent({
    reason,
    seller: params.seller,
    drop: params.drop,
    size: params.size,
    order: params.order,
    message: params.message,
  });

  const sellerProfile = params.seller
    ? await fetchPublicSeller(params.seller)
    : null;

  return (
    <SellerBrandTheme accent={sellerProfile?.accent}>
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4">
      <div className="w-full max-w-md rounded-lg border border-sakura-petal bg-sakura-surface p-8 text-center">
        <p className="text-xs uppercase tracking-widest text-sakura-warning">
          {content.eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-sakura-ink">
          {content.title}
        </h1>
        <p className="mt-2 text-sm text-sakura-stone">{content.description}</p>

        {params.size && (
          <p className="mt-3 text-xs text-sakura-mist">Size {params.size}</p>
        )}

        {params.order && (
          <p className="mt-2 font-mono text-xs text-sakura-mist">
            Order {params.order}
          </p>
        )}

        {!content.reserved && reason !== "timeout" && (
          <p className="mt-3 text-xs text-sakura-mist">
            Your unit has not been reserved.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <NextLink href={content.primaryHref} className={brandCtaLinkLgClass}>
            {content.primaryLabel}
          </NextLink>
          <NextLink
            href={content.secondaryHref}
            className="brand-accent-link text-sm hover:underline"
          >
            {content.secondaryLabel}
          </NextLink>
        </div>
      </div>
    </main>
    </SellerBrandTheme>
  );
}
