import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Settings</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Account and brand settings — mock UI until kurae-api.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Account</h2>
        <div>
          <label className="mb-1 block text-sm text-sakura-mist">Email</label>
          <Input value={session.email} disabled />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sakura-mist">Brand name</label>
          <Input defaultValue={session.sellerName} />
        </div>
        <div>
          <label className="mb-1 block text-sm text-sakura-mist">Store URL</label>
          <Input value={`kurae.com/${session.sellerSlug}`} disabled />
        </div>
        <Button type="button" disabled className="bg-sakura-dusk">
          Save changes
        </Button>
      </section>

      <section className="space-y-2 rounded-lg border border-sakura-petal p-5">
        <h2 className="text-sm font-medium text-sakura-ink">Phase 2</h2>
        <p className="text-sm text-sakura-mist">
          Branding, referrals, and discounts have dedicated mock pages in the
          sidebar.
        </p>
      </section>
    </div>
  );
}
