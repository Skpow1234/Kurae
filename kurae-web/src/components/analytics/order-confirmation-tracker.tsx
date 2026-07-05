"use client";

import { useEffect, useRef } from "react";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";

type OrderConfirmationTrackerProps = {
  orderId: string;
  sellerSlug: string;
  dropSlug: string;
  amountCents: number;
  currency: string;
  paymentProvider?: string;
};

export function OrderConfirmationTracker({
  orderId,
  sellerSlug,
  dropSlug,
  amountCents,
  currency,
  paymentProvider,
}: OrderConfirmationTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) {
      return;
    }
    tracked.current = true;
    trackEvent(AnalyticsEvents.orderPaid, {
      order_id: orderId,
      seller_slug: sellerSlug,
      drop_slug: dropSlug,
      amount_cents: amountCents,
      currency,
      payment_provider: paymentProvider,
    });
  }, [amountCents, currency, dropSlug, orderId, paymentProvider, sellerSlug]);

  return null;
}
