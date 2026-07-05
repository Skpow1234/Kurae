"use client";

import { useEffect, useRef } from "react";

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
