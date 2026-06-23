import { requireApiBase } from "@/lib/api/config";

export { isApiConfigured } from "@/lib/api/config";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = requireApiBase();

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(await res.text(), res.status);
  }

  return res.json() as Promise<T>;
}
