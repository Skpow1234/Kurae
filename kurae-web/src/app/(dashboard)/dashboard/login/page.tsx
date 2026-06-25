import { redirect } from "next/navigation";

import { authUrl, safeRedirectPath } from "@/lib/auth/safe-redirect";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function DashboardLoginRedirectPage({
  searchParams,
}: PageProps) {
  const { next } = await searchParams;
  redirect(
    authUrl({
      role: "seller",
      next: safeRedirectPath(next, "/dashboard"),
    }),
  );
}
