import { redirect } from "next/navigation";

import { authUrl } from "@/lib/auth/safe-redirect";
import { getBuyerSession } from "@/lib/auth/session";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getBuyerSession();
  if (!session) {
    redirect(authUrl({ role: "buyer", next: "/account" }));
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">{children}</main>
  );
}
