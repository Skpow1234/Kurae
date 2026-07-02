const STORAGE_KEY = "kurae_guest_checkout_email";

export function readGuestCheckoutEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function writeGuestCheckoutEmail(email: string) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = email.trim();
    if (trimmed) {
      sessionStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures
  }
}
