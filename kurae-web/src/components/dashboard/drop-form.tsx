"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DropFormValues, PublishStatus, SellerDrop, SellerSession } from "@/lib/types";
import { DEFAULT_DROP_SIZES } from "@/lib/constants/sizes";
import {
  fromDatetimeLocalValue,
  slugify,
  toDatetimeLocalValue,
  validateDropForm,
  type DropFormErrors,
} from "@/lib/validation/drop";

type DropFormProps = {
  session: SellerSession;
  drop?: SellerDrop;
};

function defaultValues(session: SellerSession): DropFormValues {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    title: "",
    slug: "",
    description: "",
    story: "",
    priceDollars: "",
    inventory: "50",
    startsAt: toDatetimeLocalValue(start.toISOString()),
    endsAt: toDatetimeLocalValue(end.toISOString()),
    promoMessage: "",
    heroImageUrl: "",
    galleryImageUrls: [],
    sizes: DEFAULT_DROP_SIZES.map((s) => ({ ...s })),
    publishStatus: "draft",
  };
}

function fromSellerDrop(drop: SellerDrop): DropFormValues {
  return {
    title: drop.title,
    slug: drop.slug,
    description: drop.description,
    story: drop.story,
    priceDollars: (drop.priceCents / 100).toFixed(2),
    inventory: String(drop.inventoryTotal),
    startsAt: toDatetimeLocalValue(drop.startsAt),
    endsAt: toDatetimeLocalValue(drop.endsAt),
    promoMessage: drop.promoMessage ?? "",
    heroImageUrl: drop.heroImageUrl,
    galleryImageUrls: drop.galleryImageUrls,
    sizes: drop.sizes.map((s) => ({ ...s })),
    publishStatus: drop.publishStatus,
  };
}

function toPayload(values: DropFormValues) {
  return {
    title: values.title.trim(),
    slug: values.slug.trim(),
    description: values.description.trim(),
    story: values.story.trim(),
    priceCents: Math.round(parseFloat(values.priceDollars) * 100),
    inventoryTotal: parseInt(values.inventory, 10),
    startsAt: fromDatetimeLocalValue(values.startsAt),
    endsAt: fromDatetimeLocalValue(values.endsAt),
    promoMessage: values.promoMessage.trim() || null,
    heroImageUrl: values.heroImageUrl,
    galleryImageUrls: values.galleryImageUrls,
    sizes: values.sizes,
    publishStatus: values.publishStatus,
  };
}

export function DropForm({ session, drop }: DropFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<DropFormValues>(
    drop ? fromSellerDrop(drop) : defaultValues(session),
  );
  const [errors, setErrors] = useState<DropFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(drop));

  const setField = useCallback(
    <K extends keyof DropFormValues>(key: K, value: DropFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  function handleTitleChange(title: string) {
    setField("title", title);
    if (!slugTouched) {
      setField("slug", slugify(title));
    }
  }

  function handleHeroFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setField("heroImageUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleGalleryFiles(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setValues((prev) => ({
            ...prev,
            galleryImageUrls: [...prev.galleryImageUrls, reader.result as string].slice(
              0,
              4,
            ),
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function toggleSize(id: string) {
    setValues((prev) => ({
      ...prev,
      sizes: prev.sizes.map((s) =>
        s.id === id ? { ...s, available: !s.available } : s,
      ),
    }));
  }

  async function save(publishStatus: PublishStatus) {
    const next = { ...values, publishStatus };
    const validation = validateDropForm(next);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    const payload = { ...toPayload(next), publishStatus };

    try {
      const res = drop
        ? await fetch(`/api/mock/drops/${drop.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/mock/drops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setErrors({ title: data.error ?? "Failed to save" });
        return;
      }

      const data = (await res.json()) as { drop: SellerDrop };
      router.push(`/dashboard/drops/${data.drop.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const previewHref = values.slug
    ? `/${session.sellerSlug}/${values.slug}${
        values.publishStatus === "draft" || !drop ? "?preview=1" : ""
      }`
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">
            {drop ? "Edit drop" : "New drop"}
          </h1>
          <p className="mt-1 text-sm text-sakura-mist">
            Launch a limited drop in under 10 minutes.
          </p>
        </div>
        {previewHref && values.heroImageUrl && (
          <Link
            href={previewHref}
            target="_blank"
            className="text-sm font-medium text-sakura-dusk hover:underline"
          >
            Preview public page →
          </Link>
        )}
      </div>

      <form
        className="max-w-2xl space-y-6"
        onSubmit={(e) => e.preventDefault()}
      >
        <fieldset className="space-y-4 rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <legend className="px-1 text-sm font-medium text-sakura-ink">
            Basics
          </legend>

          <Field label="Title" error={errors.title}>
            <Input
              value={values.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Sakura Hoodie — Drop 001"
            />
          </Field>

          <Field label="URL slug" error={errors.slug}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-sakura-mist">
                /{session.sellerSlug}/
              </span>
              <Input
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField("slug", e.target.value);
                }}
                placeholder="sakura-hoodie"
              />
            </div>
          </Field>

          <Field label="Short description" error={errors.description}>
            <textarea
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className="w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-sm"
              placeholder="One line for the hero and social previews"
            />
          </Field>

          <Field label="Story">
            <textarea
              value={values.story}
              onChange={(e) => setField("story", e.target.value)}
              rows={4}
              className="w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 py-2 text-sm"
              placeholder="Product story below the fold"
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <legend className="px-1 text-sm font-medium text-sakura-ink">
            Commerce
          </legend>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price (USD)" error={errors.priceDollars}>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.priceDollars}
                onChange={(e) => setField("priceDollars", e.target.value)}
                placeholder="89.00"
              />
            </Field>
            <Field label="Inventory" error={errors.inventory}>
              <Input
                type="number"
                min="1"
                value={values.inventory}
                onChange={(e) => setField("inventory", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" error={errors.startsAt}>
              <Input
                type="datetime-local"
                value={values.startsAt}
                onChange={(e) => setField("startsAt", e.target.value)}
              />
            </Field>
            <Field label="Ends" error={errors.endsAt}>
              <Input
                type="datetime-local"
                value={values.endsAt}
                onChange={(e) => setField("endsAt", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Promo message (optional)">
            <Input
              value={values.promoMessage}
              onChange={(e) => setField("promoMessage", e.target.value)}
              placeholder="Free shipping over $100"
            />
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <legend className="px-1 text-sm font-medium text-sakura-ink">
            Imagery
          </legend>

          <Field label="Hero image" error={errors.heroImageUrl}>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleHeroFile(e.target.files?.[0] ?? null)}
            />
            {values.heroImageUrl && (
              <div className="relative mt-3 aspect-video w-full max-w-sm overflow-hidden rounded-md ring-1 ring-sakura-petal">
                <Image
                  src={values.heroImageUrl}
                  alt="Hero preview"
                  fill
                  className="object-cover"
                  unoptimized={values.heroImageUrl.startsWith("data:")}
                />
              </div>
            )}
          </Field>

          <Field label="Gallery images (up to 4)">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => handleGalleryFiles(e.target.files)}
            />
            {values.galleryImageUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {values.galleryImageUrls.map((url) => (
                  <div
                    key={url.slice(0, 32)}
                    className="relative aspect-square overflow-hidden rounded-md ring-1 ring-sakura-petal"
                  >
                    <Image
                      src={url}
                      alt="Gallery preview"
                      fill
                      className="object-cover"
                      unoptimized={url.startsWith("data:")}
                    />
                  </div>
                ))}
              </div>
            )}
          </Field>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-sakura-petal bg-sakura-surface/50 p-5">
          <legend className="px-1 text-sm font-medium text-sakura-ink">
            Sizes
          </legend>
          <p className="text-sm text-sakura-mist">
            Toggle which sizes are available for this drop.
          </p>
          <div className="flex flex-wrap gap-4">
            {values.sizes.map((size) => (
              <label
                key={size.id}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={size.available}
                  onChange={() => toggleSize(size.id)}
                  className="rounded border-sakura-petal text-sakura-blush focus:ring-sakura-bloom"
                />
                <span className="font-medium text-sakura-ink">{size.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => save("draft")}
          >
            Save draft
          </Button>
          <Button
            type="button"
            className="bg-sakura-blush text-sakura-ink hover:bg-sakura-bloom"
            disabled={saving}
            onClick={() => save("published")}
          >
            {saving ? "Saving…" : drop?.publishStatus === "published" ? "Update drop" : "Publish drop"}
          </Button>
          {drop?.publishStatus === "published" && (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => save("draft")}
            >
              Unpublish
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-sakura-ink">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-sakura-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
