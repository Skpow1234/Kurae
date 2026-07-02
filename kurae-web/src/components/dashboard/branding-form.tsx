"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ACCENT_PRESETS } from "@/lib/branding/accents";
import { shouldUnoptimizeImageSrc } from "@/lib/images";
import type { StorefrontPreview } from "@/lib/storefront-preview";
import type { BrandAccent, SellerBranding } from "@/lib/types";
import { uploadProductImage } from "@/lib/uploads/product-image";

type BrandingFormProps = {
  initial: SellerBranding;
  sellerName: string;
  storefrontPreview: StorefrontPreview;
};

export function BrandingForm({
  initial,
  sellerName,
  storefrontPreview,
}: BrandingFormProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [accent, setAccent] = useState<BrandAccent>(initial.accent || "blush");
  const [bio, setBio] = useState(initial.bio);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const url = await uploadProductImage(file);
      setLogoUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload logo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl, accent, bio }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        branding?: SellerBranding;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not save branding.");
        return;
      }
      if (data?.branding) {
        setLogoUrl(data.branding.logoUrl);
        setAccent(data.branding.accent);
        setBio(data.branding.bio);
      }
      setSaved(true);
    } catch {
      setError("Could not save branding.");
    } finally {
      setPending(false);
    }
  }

  function removeLogo() {
    setLogoUrl("");
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Logo</label>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-sakura-petal">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized={shouldUnoptimizeImageSrc(logoUrl)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-sakura-dusk">
                  {sellerName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || pending}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={removeLogo}
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void handleLogoChange(e)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Accent color</label>
          <div className="flex gap-3">
            {ACCENT_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setAccent(s.id)}
                className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ${s.swatchClass} ${
                  accent === s.id ? "ring-sakura-ink" : "ring-transparent"
                }`}
                title={s.label}
                aria-label={s.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="brand-bio" className="mb-1 block text-sm font-medium">
            Bio
          </label>
          <textarea
            id="brand-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="Japanese-inspired clothing. Limited drops only."
            className="w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-sakura-mist">{bio.length}/280</p>
        </div>

        {error && (
          <p className="text-sm text-sakura-warning" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-sakura-success">Branding saved.</p>
        )}

        <Button type="submit" disabled={pending || uploading} className="bg-sakura-dusk">
          {pending ? "Saving…" : "Save branding"}
        </Button>
      </section>

      <section className="rounded-lg border border-sakura-petal p-5">
        <p className="text-xs uppercase tracking-wide text-sakura-mist">Preview</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-sakura-petal">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized={shouldUnoptimizeImageSrc(logoUrl)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-semibold text-sakura-dusk">
                {sellerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-sakura-ink">{sellerName}</p>
            <p className="text-sm text-sakura-mist">
              {bio.trim() || "Your brand bio appears on public drop pages."}
            </p>
          </div>
        </div>
        <div
          className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-sakura-ink"
          style={{ backgroundColor: ACCENT_PRESETS.find((p) => p.id === accent)?.primary }}
        >
          Accent preview
        </div>
        <div className="mt-6 border-t border-sakura-petal pt-4">
          <p className="text-sm text-sakura-stone">
            Logo, accent, and bio appear on your public storefront at{" "}
            <span className="font-mono text-sakura-ink">{storefrontPreview.href}</span>
            .
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href={storefrontPreview.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md border border-sakura-petal bg-sakura-paper px-4 text-sm font-medium text-sakura-ink hover:bg-sakura-surface"
            >
              Open storefront
            </Link>
            {storefrontPreview.dropPreviewHref && (
              <Link
                href={storefrontPreview.dropPreviewHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-sakura-dusk hover:bg-sakura-surface hover:underline"
              >
                Preview drop
                {storefrontPreview.dropTitle
                  ? `: ${storefrontPreview.dropTitle}`
                  : ""}
              </Link>
            )}
          </div>
        </div>
      </section>
    </form>
  );
}
