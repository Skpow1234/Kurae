import { redirect } from "next/navigation";

import { DropForm } from "@/components/dashboard/drop-form";
import { getSellerDrop } from "@/lib/api/drops-server";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDropPage({ params }: PageProps) {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  const { id } = await params;
  const drop = await getSellerDrop(id);

  if (!drop || drop.sellerSlug !== session.sellerSlug) {
    redirect("/dashboard/drops");
  }

  return <DropForm session={session} drop={drop} />;
}
