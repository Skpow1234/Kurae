"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";

import { ShareCardPreview } from "@/components/referral/share-card-preview";
import { Button } from "@/components/ui/button";

type ReferralShareTarget = {
  sellerSlug: string;
  dropSlug?: string;
  code: string;
};

type ShareButtonProps = {
  title: string;
  text: string;
  shareUrl?: string;
  referralShare?: ReferralShareTarget;
};

export function ShareButton({
  title,
  text,
  shareUrl,
  referralShare,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function resolveShareUrl(): string {
    if (shareUrl?.trim()) return shareUrl.trim();
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }

  async function handleShare() {
    if (referralShare) {
      setPreviewOpen(true);
      return;
    }

    const url = resolveShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void handleShare()}
        className="border-sakura-petal bg-sakura-paper hover:bg-sakura-petal"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Link copied
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Share drop
          </>
        )}
      </Button>

      {referralShare && (
        <ShareCardPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          shareUrl={shareUrl?.trim() || resolveShareUrl()}
          sellerSlug={referralShare.sellerSlug}
          dropSlug={referralShare.dropSlug}
          code={referralShare.code}
        />
      )}
    </>
  );
}

type CopyLinkButtonProps = {
  shareUrl?: string;
  referralShare?: ReferralShareTarget;
};

export function CopyLinkButton({ shareUrl, referralShare }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  function resolveShareUrl(): string {
    if (shareUrl?.trim()) return shareUrl.trim();
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }

  async function handleCopy() {
    if (referralShare) {
      setPreviewOpen(true);
      return;
    }

    await navigator.clipboard.writeText(resolveShareUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="inline-flex items-center gap-1.5 text-sm brand-accent-link hover:underline"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : referralShare ? "Share link" : "Copy link"}
      </button>

      {referralShare && (
        <ShareCardPreview
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          shareUrl={shareUrl?.trim() || resolveShareUrl()}
          sellerSlug={referralShare.sellerSlug}
          dropSlug={referralShare.dropSlug}
          code={referralShare.code}
        />
      )}
    </>
  );
}
