package payments

import "strings"

func majorAmount(amountCents int, currency string) float64 {
	return float64(amountCents) / 100.0
}

func normalizeCurrency(currency string) string {
	return strings.ToUpper(strings.TrimSpace(currency))
}
