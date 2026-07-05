"use client";

import { useEffect, useRef } from "react";

import { AnalyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/track";
import {
  mergeCampaignAttribution,
  parseCampaignFromSearchParams,
} from "@/lib/campaign";
import { readCampaignCookie, writeCampaignCookie } from "@/lib/campaign-client";

type TrafficCaptureProps = {
  sellerSlug: string;
  dropId?: string;
};

export function TrafficCapture({ sellerSlug, dropId }: TrafficCaptureProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;

    const params = new URLSearchParams(window.location.search);
    const fromUrl = parseCampaignFromSearchParams(params);
    const existing = readCampaignCookie();
    const campaign = mergeCampaignAttribution(sellerSlug, fromUrl, existing);
    if (campaign) {
      writeCampaignCookie(campaign);
    }

    const hasDrop = Boolean(dropId?.trim());
    const hasCampaign = Boolean(campaign);
    if (!hasDrop && !hasCampaign) return;

    tracked.current = true;

    const utmProps = {
      utm_source: campaign?.source,
      utm_medium: campaign?.medium,
      utm_campaign: campaign?.campaign,
      utm_term: campaign?.term,
      utm_content: campaign?.content,
    };

    if (hasDrop) {
      trackEvent(AnalyticsEvents.dropViewed, {
        seller_slug: sellerSlug,
        drop_id: dropId!.trim(),
        ...utmProps,
      });
    } else {
      trackEvent(AnalyticsEvents.sellerStorefrontViewed, {
        seller_slug: sellerSlug,
        ...utmProps,
      });
    }

    void fetch("/api/analytics/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerSlug,
        dropId: dropId?.trim() || undefined,
        utmSource: campaign?.source,
        utmMedium: campaign?.medium,
        utmCampaign: campaign?.campaign,
        utmTerm: campaign?.term,
        utmContent: campaign?.content,
      }),
    }).catch(() => {
      tracked.current = false;
    });
  }, [sellerSlug, dropId]);

  return null;
}
