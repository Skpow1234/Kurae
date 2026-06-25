import { redirect } from "next/navigation";

import { authUrl, safeRedirectPath } from "@/lib/auth/safe-redirect";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function DashboardSignupRedirectPage({
  searchParams,
}: PageProps) {
  const { next } = await searchParams;
  redirect(
    authUrl({
      mode: "signup",
      role: "seller",
      next: safeRedirectPath(next, "/dashboard/drops/new"),
    }),
  );
}
