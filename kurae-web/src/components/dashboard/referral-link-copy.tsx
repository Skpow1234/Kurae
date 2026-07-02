"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildReferralLinkForCode } from "@/lib/referral";

type ReferralLinkCopyProps = {
  sellerSlug: string;
  code: string;
  dropSlug?: string;
  hint?: string;
};

export function ReferralLinkCopy({
  sellerSlug,
  code,
  dropSlug,
  hint,
}: ReferralLinkCopyProps) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? buildReferralLinkForCode(
          window.location.origin,
          sellerSlug,
          code,
          dropSlug,
        )
      : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Input value={link} readOnly className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {hint && <p className="text-xs text-sakura-mist">{hint}</p>}
    </div>
  );
}
