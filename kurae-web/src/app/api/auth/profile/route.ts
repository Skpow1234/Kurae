import type { NextRequest } from "next/server";

import { handleUpdateProfile } from "@/lib/api/auth-handlers";

export async function PATCH(request: NextRequest) {
  return handleUpdateProfile(request);
}
