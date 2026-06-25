import type { NextRequest } from "next/server";

import { handleBuyerSignup } from "@/lib/api/auth-handlers";

export async function POST(request: NextRequest) {
  return handleBuyerSignup(request);
}
