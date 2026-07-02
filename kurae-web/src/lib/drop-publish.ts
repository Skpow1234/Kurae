import type { PublishStatus } from "@/lib/types";

export function formatDropPublishStatus(
  status: PublishStatus,
  startsAt: string,
): string {
  switch (status) {
    case "published":
      return "Published";
    case "scheduled": {
      const date = new Date(startsAt);
      const label = date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `Scheduled · ${label}`;
    }
    default:
      return "Draft";
  }
}

export function isDropPreviewOnly(status: PublishStatus): boolean {
  return status === "draft" || status === "scheduled";
}

export function isStartsAtInFuture(startsAt: string, now = Date.now()): boolean {
  return new Date(startsAt).getTime() > now;
}
