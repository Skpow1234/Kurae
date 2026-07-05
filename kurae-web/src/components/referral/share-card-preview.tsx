"use client";

import Image from "next/image";
import { Check, Copy, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildReferralPageDescription,
  buildReferralPageTitle,
  fetchReferralPreviewClient,
  type ReferralPreview,
} from "@/lib/referral-preview";
import { shouldUnoptimizeImageSrc } from "@/lib/images";
import { cn } from "@/lib/utils";

type ShareCardPreviewProps = {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  sellerSlug: string;
  dropSlug?: string;
  code: string;
};

export function ShareCardPreview({
  open,
  onClose,
  shareUrl,
  sellerSlug,
  dropSlug,
  code,
}: ShareCardPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<ReferralPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setPreview(null);
    setCopied(false);

    void fetchReferralPreviewClient({ sellerSlug, dropSlug, code })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, sellerSlug, dropSlug, code]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (!preview) return;
    const title = buildReferralPageTitle(preview);
    const text = buildReferralPageDescription(preview);

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch {
        /* fall through */
      }
    }

    await copyLink();
  }

  const heroImage =
    preview?.heroImageUrl?.trim() || preview?.logoUrl?.trim() || null;
  const accent = preview?.accent?.trim() || "#a67a7a";

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
        "rounded-lg border border-sakura-petal bg-sakura-paper p-0 shadow-lg",
        "backdrop:bg-sakura-ink/40 backdrop:backdrop-blur-sm",
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-sakura-mist">
              Share preview
            </p>
            <h2 className="mt-1 text-lg font-semibold text-sakura-ink">
              How your link looks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-sakura-mist hover:bg-sakura-petal hover:text-sakura-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-sakura-petal bg-sakura-surface">
          {loading ? (
            <div className="flex aspect-[1200/630] items-center justify-center text-sm text-sakura-mist">
              Loading preview…
            </div>
          ) : preview ? (
            <div className="flex aspect-[1200/630] flex-col sm:flex-row">
              <div
                className="relative min-h-[140px] w-full sm:w-[38%]"
                style={{ backgroundColor: accent }}
              >
                {heroImage ? (
                  <Image
                    src={heroImage}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={shouldUnoptimizeImageSrc(heroImage)}
                  />
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center text-3xl font-bold text-sakura-paper">
                    {preview.sellerName?.slice(0, 1) ?? "K"}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
                <div className="space-y-2">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-widest sm:text-xs"
                    style={{ color: accent }}
                  >
                    {preview.referrerLabel ?? "A friend"} invited you
                  </p>
                  <p className="text-base font-semibold leading-tight text-sakura-ink sm:text-lg">
                    {preview.dropTitle?.trim() ||
                      preview.sellerName?.trim() ||
                      "Limited drop"}
                  </p>
                  <p className="line-clamp-3 text-xs text-sakura-mist sm:text-sm">
                    {buildReferralPageDescription(preview)}
                  </p>
                </div>
                <p className="text-[10px] uppercase tracking-widest text-sakura-mist">
                  Kurae · {preview.sellerName}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center px-6 text-center text-sm text-sakura-mist">
              Could not load share preview for this link.
            </div>
          )}
        </div>

        <p className="mt-3 break-all font-mono text-xs text-sakura-mist">{shareUrl}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => void copyLink()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            disabled={!preview}
            onClick={() => void nativeShare()}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>
    </dialog>
  );
}
