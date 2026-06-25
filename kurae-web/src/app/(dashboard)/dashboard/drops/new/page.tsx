import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";

export default async function NewDropPage() {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  return <DropForm session={session} />;
}
