"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildReferralLink } from "@/lib/referral";

type ReferralLinkCopyProps = {
  sellerSlug: string;
  dropSlug: string;
  code: string;
};

export function ReferralLinkCopy({
  sellerSlug,
  dropSlug,
  code,
}: ReferralLinkCopyProps) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? buildReferralLink(window.location.origin, sellerSlug, dropSlug, code)
      : "";

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <Input value={link} readOnly className="font-mono text-xs" />
      <Button type="button" variant="outline" size="icon" onClick={() => void copy()}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
