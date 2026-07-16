import { redirect } from "next/navigation";
import { Suspense } from "react";

import { WebhookEventsTable } from "@/components/dashboard/webhook-events-table";
import { ApiLoadError } from "@/components/ui/api-load-error";
import { fetchSellerWebhookEvents } from "@/lib/api/webhook-events";
import { getSellerSession } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/safe-redirect";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function WebhooksPage({ searchParams }: PageProps) {
  const session = await getSellerSession();
  if (!session) redirect(authUrl({ role: "seller", next: "/dashboard" }));

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  let result;
  try {
    result = await fetchSellerWebhookEvents({ page, pageSize: 20 });
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-sakura-ink">
            Payment events
          </h1>
          <p className="mt-1 text-sm text-sakura-mist">
            Webhook history from Stripe and LATAM payment providers.
          </p>
        </div>
        <ApiLoadError message="Could not load payment events. Check that kurae-api is running and migration 016 is applied." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sakura-ink">
          Payment events
        </h1>
        <p className="mt-1 text-sm text-sakura-mist">
          Webhook history from Stripe and LATAM payment providers for your
          orders.
        </p>
      </div>
      <Suspense>
        <WebhookEventsTable
          events={result.events}
          total={result.total}
          page={result.page}
        />
      </Suspense>
    </div>
  );
}
