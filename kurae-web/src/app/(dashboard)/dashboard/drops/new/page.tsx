import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";
import { requireTeamRole } from "@/lib/require-team-role";

export default async function NewDropPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));
  requireTeamRole(session.teamRole, ["owner", "admin"]);

  return <DropForm session={session} />;
}
