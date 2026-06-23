import type { NextRequest } from "next/server";

import { handleChangePassword } from "@/lib/api/auth-handlers";

export async function PATCH(request: NextRequest) {
  return handleChangePassword(request);
}
