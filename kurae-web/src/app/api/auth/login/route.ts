import type { NextRequest } from "next/server";

import { handleLogin } from "@/lib/api/auth-handlers";

export async function POST(request: NextRequest) {
  return handleLogin(request);
}
