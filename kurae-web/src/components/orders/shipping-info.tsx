import type { ShippingAddress } from "@/lib/types/shipping";
import { formatShippingAddress } from "@/lib/validation/shipping";

type ShippingInfoProps = {
  address?: ShippingAddress | null;
  trackingNumber?: string;
  shippedAt?: string;
};

export function ShippingInfo({
  address,
  trackingNumber,
  shippedAt,
}: ShippingInfoProps) {
  if (!address && !trackingNumber) {
    return null;
  }

  return (
    <section className="rounded-lg border border-sakura-petal bg-sakura-surface p-4">
      <h2 className="text-xs font-medium uppercase tracking-wide text-sakura-mist">
        Shipping
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        {address && (
          <div>
            <dt className="text-sakura-mist">Ship to</dt>
            <dd className="mt-1 whitespace-pre-line text-sakura-ink">
              {formatShippingAddress(address)}
            </dd>
          </div>
        )}
        {trackingNumber && (
          <div className="flex justify-between gap-4 border-t border-sakura-petal pt-3">
            <dt className="text-sakura-mist">Tracking</dt>
            <dd className="font-mono text-right text-sakura-ink">{trackingNumber}</dd>
          </div>
        )}
        {shippedAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-sakura-mist">Shipped</dt>
            <dd className="text-right text-sakura-ink">
              {new Date(shippedAt).toLocaleString()}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
