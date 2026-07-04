import type { ShippingAddress } from "@/lib/types/shipping";

export type ShippingAddressErrors = Partial<Record<keyof ShippingAddress, string>>;

export function validateShippingAddress(
  address: ShippingAddress,
): ShippingAddressErrors {
  const errors: ShippingAddressErrors = {};

  if (!address.name.trim()) errors.name = "Full name is required";
  if (!address.line1.trim()) errors.line1 = "Address line 1 is required";
  if (!address.city.trim()) errors.city = "City is required";
  if (!address.region.trim()) errors.region = "State / region is required";
  if (!address.postalCode.trim()) errors.postalCode = "Postal code is required";
  if (!address.country.trim()) {
    errors.country = "Country is required";
  } else if (address.country.trim().length !== 2) {
    errors.country = "Use a 2-letter country code";
  }

  return errors;
}

export function formatShippingAddress(address: ShippingAddress): string {
  const lines = [
    address.name,
    address.line1,
    address.line2?.trim(),
    `${address.city}, ${address.region} ${address.postalCode}`,
    address.country.toUpperCase(),
  ].filter(Boolean);
  return lines.join("\n");
}
