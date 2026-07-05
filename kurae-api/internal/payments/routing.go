package payments

import "strings"

func SelectProviderForCurrency(currency string, cfg Config) string {
	code := strings.ToUpper(strings.TrimSpace(currency))
	switch code {
	case "COP":
		if cfg.WompiConfigured() {
			return ProviderWompi
		}
		if cfg.PayUConfigured() {
			return ProviderPayU
		}
		if cfg.MercadoPagoConfigured() {
			return ProviderMercadoPago
		}
	case "BRL", "MXN", "ARS", "CLP", "PEN", "UYU":
		if cfg.MercadoPagoConfigured() {
			return ProviderMercadoPago
		}
	}
	return ProviderStripe
}

func IsLatamCurrency(currency string) bool {
	switch strings.ToUpper(strings.TrimSpace(currency)) {
	case "COP", "BRL", "MXN", "ARS", "CLP", "PEN", "UYU":
		return true
	default:
		return false
	}
}
