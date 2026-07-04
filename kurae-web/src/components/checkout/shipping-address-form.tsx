import { Input } from "@/components/ui/input";
import type { ShippingAddress } from "@/lib/types/shipping";
import type { ShippingAddressErrors } from "@/lib/validation/shipping";

type ShippingAddressFormProps = {
  value: ShippingAddress;
  errors?: ShippingAddressErrors;
  disabled?: boolean;
  onChange: (next: ShippingAddress) => void;
};

export function ShippingAddressForm({
  value,
  errors = {},
  disabled = false,
  onChange,
}: ShippingAddressFormProps) {
  function updateField<K extends keyof ShippingAddress>(
    field: K,
    fieldValue: ShippingAddress[K],
  ) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <fieldset className="space-y-4" disabled={disabled}>
      <legend className="text-sm font-medium text-sakura-ink">Shipping address</legend>
      <div>
        <label htmlFor="ship-name" className="mb-1 block text-sm font-medium">
          Full name
        </label>
        <Input
          id="ship-name"
          value={value.name}
          onChange={(e) => updateField("name", e.target.value)}
          autoComplete="name"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-sakura-warning">{errors.name}</p>
        )}
      </div>
      <div>
        <label htmlFor="ship-line1" className="mb-1 block text-sm font-medium">
          Address line 1
        </label>
        <Input
          id="ship-line1"
          value={value.line1}
          onChange={(e) => updateField("line1", e.target.value)}
          autoComplete="address-line1"
        />
        {errors.line1 && (
          <p className="mt-1 text-xs text-sakura-warning">{errors.line1}</p>
        )}
      </div>
      <div>
        <label htmlFor="ship-line2" className="mb-1 block text-sm font-medium">
          Address line 2 <span className="text-sakura-mist">(optional)</span>
        </label>
        <Input
          id="ship-line2"
          value={value.line2 ?? ""}
          onChange={(e) => updateField("line2", e.target.value)}
          autoComplete="address-line2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ship-city" className="mb-1 block text-sm font-medium">
            City
          </label>
          <Input
            id="ship-city"
            value={value.city}
            onChange={(e) => updateField("city", e.target.value)}
            autoComplete="address-level2"
          />
          {errors.city && (
            <p className="mt-1 text-xs text-sakura-warning">{errors.city}</p>
          )}
        </div>
        <div>
          <label htmlFor="ship-region" className="mb-1 block text-sm font-medium">
            State / region
          </label>
          <Input
            id="ship-region"
            value={value.region}
            onChange={(e) => updateField("region", e.target.value)}
            autoComplete="address-level1"
          />
          {errors.region && (
            <p className="mt-1 text-xs text-sakura-warning">{errors.region}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ship-postal" className="mb-1 block text-sm font-medium">
            Postal code
          </label>
          <Input
            id="ship-postal"
            value={value.postalCode}
            onChange={(e) => updateField("postalCode", e.target.value)}
            autoComplete="postal-code"
          />
          {errors.postalCode && (
            <p className="mt-1 text-xs text-sakura-warning">{errors.postalCode}</p>
          )}
        </div>
        <div>
          <label htmlFor="ship-country" className="mb-1 block text-sm font-medium">
            Country
          </label>
          <Input
            id="ship-country"
            value={value.country}
            onChange={(e) => updateField("country", e.target.value.toUpperCase())}
            autoComplete="country"
            maxLength={2}
            placeholder="US"
          />
          {errors.country && (
            <p className="mt-1 text-xs text-sakura-warning">{errors.country}</p>
          )}
        </div>
      </div>
    </fieldset>
  );
}
