import type { DropStatus } from "@/lib/types";

type DropStatusBannerProps = {
  status: DropStatus;
};

export function DropStatusBanner({ status }: DropStatusBannerProps) {
  if (status === "live" || status === "upcoming") return null;

  const copy =
    status === "sold_out"
      ? {
          title: "This drop is sold out",
          body: "Every unit has been claimed. Join the waitlist — we'll notify you if anything opens up.",
        }
      : {
          title: "This drop has ended",
          body: "The window for this release is closed. Follow the seller for the next drop.",
        };

  return (
    <div className="rounded-lg border border-sakura-petal bg-sakura-surface px-5 py-4">
      <p className="font-semibold text-sakura-ink">{copy.title}</p>
      <p className="mt-1 text-sm text-sakura-stone">{copy.body}</p>
    </div>
  );
}
