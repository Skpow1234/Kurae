import { apiServerFetch } from "@/lib/api/server";

export type SellerWebhookEvent = {
  id: string;
  provider: string;
  eventId: string;
  orderId?: string;
  dropTitle?: string;
  buyerEmail?: string;
  processedAt?: string | null;
  createdAt: string;
};

export type WebhookEventsListResult = {
  events: SellerWebhookEvent[];
  total: number;
  page: number;
};

export async function fetchSellerWebhookEvents(params: {
  page?: number;
  pageSize?: number;
} = {}): Promise<WebhookEventsListResult> {
  const qs = new URLSearchParams();
  if (params.page && params.page > 0) {
    qs.set("page", String(params.page));
  }
  if (params.pageSize && params.pageSize > 0) {
    qs.set("pageSize", String(params.pageSize));
  }
  const query = qs.toString();
  return apiServerFetch<WebhookEventsListResult>(
    `/webhook-events${query ? `?${query}` : ""}`,
  );
}
