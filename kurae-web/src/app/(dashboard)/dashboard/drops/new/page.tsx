export default function NewDropPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-sakura-ink">New drop</h1>
      <p className="text-sm text-sakura-mist">
        Drop builder form — wired to kurae-api in a follow-up.
      </p>
      <form className="max-w-xl space-y-4">
        {[
          { label: "Title", name: "title", type: "text" },
          { label: "Slug", name: "slug", type: "text" },
          { label: "Price (USD)", name: "price", type: "number" },
          { label: "Inventory", name: "inventory", type: "number" },
        ].map((field) => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="mb-1 block text-sm font-medium text-sakura-ink"
            >
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type={field.type}
              className="flex h-10 w-full rounded-md border border-sakura-petal bg-sakura-paper px-3 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          className="rounded-md bg-sakura-dusk px-4 py-2 text-sm font-medium text-sakura-paper hover:bg-sakura-bloom"
        >
          Save draft
        </button>
      </form>
    </div>
  );
}
