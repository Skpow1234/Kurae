import { SignupPageClient } from "@/components/dashboard/signup-page-client";

export default function StorefrontSignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4 py-12">
      <SignupPageClient variant="storefront" defaultNext="/checkout" />
    </main>
  );
}
