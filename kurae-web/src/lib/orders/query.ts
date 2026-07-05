export type OrdersExportParams = {
  status?: string;
  sort?: "newest" | "oldest";
  from?: string;
  to?: string;
};

export function buildOrdersExportHref(params: OrdersExportParams = {}): string {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") {
    qs.set("status", params.status);
  }
  if (params.sort === "oldest") {
    qs.set("sort", "oldest");
  }
  if (params.from) {
    qs.set("from", params.from);
  }
  if (params.to) {
    qs.set("to", params.to);
  }
  const query = qs.toString();
  return `/api/orders/export${query ? `?${query}` : ""}`;
}
