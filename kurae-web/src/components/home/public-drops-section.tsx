import { DropBrowseCard } from "@/components/drop/drop-browse-card";
import { listPublicDrops } from "@/lib/api/drops-server";

export async function PublicDropsSection() {
  const publicDrops = await listPublicDrops();

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-sakura-ink">
            {publicDrops.length > 0 ? "All drops" : "Drops"}
          </h2>
          <p className="mt-1 text-sm text-sakura-mist">
            {publicDrops.length > 0
              ? "Tap a drop to view details, sizes, and checkout."
              : "Nothing live yet — run the API seed or publish a drop."}
          </p>
        </div>
      </div>

      {publicDrops.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {publicDrops.map((drop, index) => (
            <DropBrowseCard
              key={drop.id}
              drop={drop}
              priority={index < 3}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-sakura-petal p-12 text-center">
          <p className="text-sakura-stone">No published drops yet.</p>
          <p className="mt-2 text-sm text-sakura-mist">
            Local dev:{" "}
            <code className="text-xs">cd kurae-api && make docker-seed</code>
          </p>
        </div>
      )}
    </>
  );
}
