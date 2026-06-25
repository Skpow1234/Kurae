import type { NextRequest } from "next/server";

import { handleBuyerLogin } from "@/lib/api/auth-handlers";

export async function POST(request: NextRequest) {
  return handleBuyerLogin(request);
}
