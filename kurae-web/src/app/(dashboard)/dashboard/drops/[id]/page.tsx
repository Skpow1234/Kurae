import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSession } from "@/lib/auth/session";
import { getDropById } from "@/lib/mock/drop-store";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDropPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/dashboard/login");

  const { id } = await params;
  const drop = getDropById(id);

  if (!drop || drop.sellerSlug !== session.sellerSlug) {
    redirect("/dashboard/drops");
  }

  return <DropForm session={session} drop={drop} />;
}
