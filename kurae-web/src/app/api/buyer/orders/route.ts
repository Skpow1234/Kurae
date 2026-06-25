import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";
import { readToken } from "@/lib/api/proxy";

export async function GET(request: Request) {
  const token = await readToken();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page") ?? "1";
  const pageSize = searchParams.get("pageSize") ?? "20";
  const qs = new URLSearchParams({ page, pageSize });

  const res = await fetch(`${requireApiBase()}/buyer/orders?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
