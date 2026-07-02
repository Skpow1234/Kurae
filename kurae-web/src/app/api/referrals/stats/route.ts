import { NextResponse } from "next/server";

import { requireApiBase } from "@/lib/api/config";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dropId = searchParams.get("dropId")?.trim();
  const code = searchParams.get("code")?.trim();

  if (!dropId || !code) {
    return NextResponse.json(
      { error: "dropId and code are required" },
      { status: 400 },
    );
  }

  const qs = new URLSearchParams({ dropId, code });
  const res = await fetch(`${requireApiBase()}/public/referrals/stats?${qs}`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
