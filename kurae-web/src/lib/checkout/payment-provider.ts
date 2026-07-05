const LATAM_CURRENCIES = new Set([
  "COP",
  "BRL",
  "MXN",
  "ARS",
  "CLP",
  "PEN",
  "UYU",
]);

export function isLatamCurrency(currency: string): boolean {
  return LATAM_CURRENCIES.has(currency.trim().toUpperCase());
}

export function isRedirectCheckout(result: {
  checkoutUrl?: string;
  paymentProvider?: string;
  clientSecret?: string;
}): boolean {
  if (result.checkoutUrl) {
    return true;
  }
  const provider = result.paymentProvider?.toLowerCase();
  return Boolean(
    provider &&
      provider !== "stripe" &&
      provider !== "noop" &&
      !result.clientSecret,
  );
}
