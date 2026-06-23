import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const codes = [
  { code: "SAKURA10", type: "10% off", uses: "12 / 50", expires: "2026-07-01" },
  { code: "EARLYBIRD", type: "$5 off", uses: "48 / 100", expires: "2026-06-30" },
];

export default function DiscountsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">Discount codes</h1>
          <p className="mt-1 text-sm text-sakura-mist">
            Create codes for checkout — mock UI (phase 2).
          </p>
        </div>
        <Button type="button" disabled className="bg-sakura-dusk">
          New code
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-sakura-petal">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Expires</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className="border-b border-sakura-petal last:border-0">
                <td className="px-4 py-3 font-mono font-medium">{c.code}</td>
                <td className="px-4 py-3">{c.type}</td>
                <td className="px-4 py-3 font-mono">{c.uses}</td>
                <td className="px-4 py-3 text-sakura-mist">{c.expires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="max-w-md space-y-3 rounded-lg border border-dashed border-sakura-petal p-5">
        <h2 className="text-sm font-medium">Create code (preview)</h2>
        <Input placeholder="CODE" disabled />
        <Input placeholder="Percentage or fixed amount" disabled />
        <Button type="button" disabled>
          Create
        </Button>
      </section>
    </div>
  );
}
