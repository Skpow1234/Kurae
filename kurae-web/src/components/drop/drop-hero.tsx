import Image from "next/image";

import { Countdown } from "@/components/drop/countdown";
import { InventoryBar } from "@/components/drop/inventory-bar";
import { Badge } from "@/components/ui/badge";
import { getStatusLabel } from "@/lib/drop-status";
import { formatPrice } from "@/lib/utils";
import type { DropStatus, PublicDrop } from "@/lib/types";

type DropHeroProps = {
  drop: PublicDrop;
};

function badgeVariant(status: DropStatus) {
  switch (status) {
    case "live":
      return "live" as const;
    case "upcoming":
      return "upcoming" as const;
    case "sold_out":
      return "soldOut" as const;
    case "expired":
      return "expired" as const;
  }
}

export function DropHero({ drop }: DropHeroProps) {
  const countdownTarget =
    drop.status === "upcoming" ? drop.startsAt : drop.endsAt;
  const countdownLabel =
    drop.status === "upcoming" ? "Starts in" : "Ends in";

  return (
    <section className="relative min-h-[70vh] overflow-hidden bg-sakura-dusk">
      <Image
        src={drop.heroImageUrl}
        alt={drop.title}
        fill
        priority
        className="object-cover opacity-60"
        sizes="100vw"
        unoptimized={drop.heroImageUrl.startsWith("data:")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sakura-dusk via-sakura-dusk/75 to-sakura-blush/20" />

      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col justify-end px-4 pb-10 pt-24">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge variant={badgeVariant(drop.status)}>
            {getStatusLabel(drop.status)}
          </Badge>
          <span className="text-sm font-semibold text-sakura-paper">
            {formatPrice(drop.priceCents, drop.currency)}
          </span>
        </div>

        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-sakura-paper sm:text-5xl">
          {drop.title}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-sakura-surface sm:text-base">
          {drop.description}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-8">
          <Countdown targetDate={countdownTarget} label={countdownLabel} />
          {(drop.status === "live" || drop.status === "sold_out") && (
            <InventoryBar
              remaining={drop.inventoryRemaining}
              total={drop.inventoryTotal}
            />
          )}
        </div>
      </div>
    </section>
  );
}
