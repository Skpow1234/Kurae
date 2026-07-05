package payments

import "strings"

type Config struct {
	StripeSecretKey string
	StripeWebhook   string
	MercadoPagoToken string
	MercadoPagoWebhookSecret string
	WompiPrivateKey  string
	WompiEventsSecret string
	PayUApiLogin     string
	PayUApiKey       string
	PayUMerchantID   string
	PayUAccountID    string
	PublicWebURL     string
	APIPublicURL     string
	Production       bool
}

func (c Config) MercadoPagoConfigured() bool {
	return strings.TrimSpace(c.MercadoPagoToken) != ""
}

func (c Config) WompiConfigured() bool {
	return strings.TrimSpace(c.WompiPrivateKey) != ""
}

func (c Config) PayUConfigured() bool {
	return strings.TrimSpace(c.PayUApiLogin) != "" &&
		strings.TrimSpace(c.PayUApiKey) != "" &&
		strings.TrimSpace(c.PayUMerchantID) != ""
}

func (c Config) StripeConfigured() bool {
	return strings.TrimSpace(c.StripeSecretKey) != ""
}
