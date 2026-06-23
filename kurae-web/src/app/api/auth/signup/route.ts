import type { NextRequest } from "next/server";

import { handleSignup } from "@/lib/api/auth-handlers";

export async function POST(request: NextRequest) {
  return handleSignup(request);
}
