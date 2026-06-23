import { handleLogout } from "@/lib/api/auth-handlers";

export async function POST() {
  return handleLogout();
}
