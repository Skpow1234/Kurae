import { redirect } from "next/navigation";

import { BuyerSettingsForm } from "@/components/account/buyer-settings-form";
import { authUrl } from "@/lib/auth/safe-redirect";
import { getBuyerSession } from "@/lib/auth/session";

export default async function BuyerAccountPage() {
  const session = await getBuyerSession();
  if (!session) {
    redirect(authUrl({ role: "buyer", next: "/account" }));
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-sakura-ink">Your account</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Manage your buyer profile and password.
        </p>
      </div>
      <BuyerSettingsForm session={session} />
    </main>
  );
}
