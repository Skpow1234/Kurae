import { AccountNav } from "@/components/account/account-nav";
import { BuyerSettingsForm } from "@/components/account/buyer-settings-form";
import { getBuyerSession } from "@/lib/auth/session";

export default async function BuyerAccountPage() {
  const session = await getBuyerSession();
  if (!session) return null;

  return (
    <>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-sakura-ink">Your account</h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Manage your buyer profile and password.
        </p>
      </div>
      <AccountNav active="settings" />
      <BuyerSettingsForm session={session} />
    </>
  );
}
