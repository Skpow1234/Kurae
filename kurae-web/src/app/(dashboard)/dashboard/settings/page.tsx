import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/dashboard/settings-form";
import { getSession } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">Settings</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Update your account and brand details.
        </p>
      </div>
      <SettingsForm session={session} />
    </div>
  );
}
