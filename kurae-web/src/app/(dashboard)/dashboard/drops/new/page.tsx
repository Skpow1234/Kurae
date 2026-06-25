import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSellerSession } from "@/lib/auth/session";

export default async function NewDropPage() {
  const session = await getSellerSession();
  if (!session) redirect("/dashboard/login");

  return <DropForm session={session} />;
}
