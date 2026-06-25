import type { BrandAccent } from "@/lib/types";

export type AccentPreset = {
  id: BrandAccent;
  label: string;
  primary: string;
  hover: string;
  soft: string;
  swatchClass: string;
};

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "blush",
    label: "Sakura blush",
    primary: "#e0b4b4",
    hover: "#d49a9a",
    soft: "#a67a7a",
    swatchClass: "bg-sakura-blush",
  },
  {
    id: "dusk",
    label: "Sakura dusk",
    primary: "#a67a7a",
    hover: "#8f6565",
    soft: "#7a5555",
    swatchClass: "bg-sakura-dusk",
  },
  {
    id: "teal",
    label: "Slate teal",
    primary: "#5c6b6a",
    hover: "#4a5756",
    soft: "#3d4847",
    swatchClass: "bg-[#5C6B6A]",
  },
];

export function getAccentPreset(accent?: string): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === accent) ?? ACCENT_PRESETS[0];
}
