export function formatDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "+100%" : "—";
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}

export function deltaTone(current: number, previous: number): "up" | "down" | "flat" {
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}
