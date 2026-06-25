import type { NextRequest } from "next/server";

import { handleBuyerChangePassword } from "@/lib/api/auth-handlers";

export async function PATCH(request: NextRequest) {
  return handleBuyerChangePassword(request);
}
