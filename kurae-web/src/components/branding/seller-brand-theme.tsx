import type { CSSProperties, ReactNode } from "react";

import { getAccentPreset } from "@/lib/branding/accents";
import type { BrandAccent } from "@/lib/types";

type SellerBrandThemeProps = {
  accent?: BrandAccent | string;
  children: ReactNode;
};

export function SellerBrandTheme({ accent, children }: SellerBrandThemeProps) {
  const preset = getAccentPreset(accent);

  const style = {
    "--brand-primary": preset.primary,
    "--brand-hover": preset.hover,
    "--brand-soft": preset.soft,
  } as CSSProperties;

  return (
    <div className="brand-themed min-h-full" style={style}>
      {children}
    </div>
  );
}
