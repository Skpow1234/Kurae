import { redirect } from "next/navigation";

import { authUrl, safeRedirectPath } from "@/lib/auth/safe-redirect";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupRedirectPage({ searchParams }: PageProps) {
  const { next } = await searchParams;
  redirect(
    authUrl({
      mode: "signup",
      role: "buyer",
      next: safeRedirectPath(next, "/"),
    }),
  );
}
