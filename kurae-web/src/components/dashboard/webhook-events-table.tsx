"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { SellerWebhookEvent } from "@/lib/api/webhook-events";

const PAGE_SIZE = 20;

type WebhookEventsTableProps = {
  events: SellerWebhookEvent[];
  total: number;
  page: number;
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "stripe":
      return "Stripe";
    case "mercadopago":
      return "Mercado Pago";
    case "wompi":
      return "Wompi";
    case "payu":
      return "PayU";
    default:
      return provider;
  }
}

export function WebhookEventsTable({
  events,
  total,
  page,
}: WebhookEventsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(next));
    }
    const qs = params.toString();
    router.push(qs ? `/dashboard/webhooks?${qs}` : "/dashboard/webhooks");
  }

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-sakura-petal bg-sakura-surface/50 px-4 py-10 text-center text-sm text-sakura-mist">
        No payment webhook events yet. Events appear here after checkout
        providers confirm payments.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-sakura-petal">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-sakura-petal bg-sakura-surface text-xs uppercase tracking-wide text-sakura-mist">
            <tr>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Event ID</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr
                key={event.id}
                className="border-b border-sakura-petal/70 last:border-0"
              >
                <td className="px-4 py-3 text-sakura-stone whitespace-nowrap">
                  {formatWhen(event.createdAt)}
                </td>
                <td className="px-4 py-3 text-sakura-ink">
                  {providerLabel(event.provider)}
                </td>
                <td className="px-4 py-3">
                  {event.orderId ? (
                    <div>
                      <Link
                        href={`/dashboard/orders/${event.orderId}`}
                        className="font-medium text-sakura-dusk hover:underline"
                      >
                        {event.dropTitle || "View order"}
                      </Link>
                      {event.buyerEmail && (
                        <p className="mt-0.5 text-xs text-sakura-mist">
                          {event.buyerEmail}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sakura-mist">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {event.processedAt ? (
                    <span className="text-sakura-success">Processed</span>
                  ) : (
                    <span className="text-sakura-warning">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-sakura-mist max-w-[12rem] truncate" title={event.eventId}>
                  {event.eventId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-sakura-mist">
        <p>
          {total} event{total === 1 ? "" : "s"} · page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-sakura-petal px-3 py-1.5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded-md border border-sakura-petal px-3 py-1.5 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
