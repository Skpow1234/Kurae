import { NextResponse } from "next/server";

import { proxyToApi, readToken } from "@/lib/api/proxy";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = await readToken();
  const res = await proxyToApi("/drops", { method: "GET" }, token);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const token = await readToken();
  const res = await proxyToApi(
    "/drops",
    { method: "POST", body: JSON.stringify(body) },
    token,
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
