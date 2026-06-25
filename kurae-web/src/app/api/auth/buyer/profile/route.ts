import type { NextRequest } from "next/server";

import { handleBuyerUpdateProfile } from "@/lib/api/auth-handlers";

export async function PATCH(request: NextRequest) {
  return handleBuyerUpdateProfile(request);
}
