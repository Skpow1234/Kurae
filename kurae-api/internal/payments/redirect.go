package payments

func IsRedirectProvider(name string) bool {
	switch name {
	case ProviderMercadoPago, ProviderWompi, ProviderPayU:
		return true
	default:
		return false
	}
}
