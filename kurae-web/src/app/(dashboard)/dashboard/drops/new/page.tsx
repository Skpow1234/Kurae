import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSession } from "@/lib/auth/session";

export default async function NewDropPage() {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  return <DropForm session={session} />;
}
