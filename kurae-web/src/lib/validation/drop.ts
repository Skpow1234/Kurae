import type { DropFormValues } from "@/lib/types";

export type DropFormErrors = Partial<Record<keyof DropFormValues, string>>;

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export function validateDropForm(values: DropFormValues): DropFormErrors {
  const errors: DropFormErrors = {};

  if (!values.title.trim()) errors.title = "Title is required";
  if (!values.slug.trim()) {
    errors.slug = "Slug is required";
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(values.slug)) {
    errors.slug = "Use lowercase letters, numbers, and hyphens only";
  }

  if (!values.description.trim()) errors.description = "Description is required";

  const primary = values.products[0];
  const priceDollars = primary?.priceDollars ?? values.priceDollars;
  const inventory = primary?.inventory ?? values.inventory;

  const price = parseFloat(priceDollars);
  if (!priceDollars || Number.isNaN(price) || price <= 0) {
    errors.priceDollars = "Enter a valid price on the first product";
  }

  const inventoryTotal = parseInt(inventory, 10);
  if (!inventory || Number.isNaN(inventoryTotal) || inventoryTotal < 1) {
    errors.inventory = "First product inventory must be at least 1";
  }

  if (values.products.some((product) => !product.name.trim())) {
    errors.title = "Every product needs a name";
  }

  if (!values.startsAt) errors.startsAt = "Start date is required";
  if (!values.endsAt) errors.endsAt = "End date is required";
  if (values.startsAt && values.endsAt && values.startsAt >= values.endsAt) {
    errors.endsAt = "End must be after start";
  }

  if (!values.heroImageUrl) {
    errors.heroImageUrl = "Hero image is required";
  }

  return errors;
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
