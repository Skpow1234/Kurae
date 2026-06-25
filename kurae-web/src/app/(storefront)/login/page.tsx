import { LoginPageClient } from "@/components/dashboard/login-page-client";

export default function StorefrontLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-sakura-paper px-4 py-12">
      <LoginPageClient variant="storefront" defaultNext="/checkout" />
    </main>
  );
}
