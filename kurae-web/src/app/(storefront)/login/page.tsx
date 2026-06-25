import { AuthPageClient } from "@/components/auth/auth-page-client";

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-sakura-paper px-4 py-12">
      <AuthPageClient />
    </main>
  );
}
