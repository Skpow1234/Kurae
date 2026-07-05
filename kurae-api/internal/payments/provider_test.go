package payments

import (
	"context"
	"strings"
	"testing"
)

func TestNoopProviderClientSecretRoundTrip(t *testing.T) {
	t.Parallel()

	provider := NewNoopProvider()
	ctx := context.Background()

	intent, err := provider.CreatePaymentIntent(ctx, IntentInput{
		OrderID:     "order-1",
		AmountCents: 1000,
		Currency:    "USD",
		Email:       "buyer@test.local",
	})
	if err != nil {
		t.Fatalf("CreatePaymentIntent: %v", err)
	}

	secret, err := provider.ClientSecret(ctx, ProviderStripe, intent.ID)
	if err != nil {
		t.Fatalf("ClientSecret: %v", err)
	}
	if secret != intent.ClientSecret {
		t.Fatalf("expected %q, got %q", intent.ClientSecret, secret)
	}
	if !strings.HasPrefix(secret, "pi_dev_") {
		t.Fatalf("expected dev secret prefix, got %q", secret)
	}
}

func TestNoopProviderClientSecretMissingID(t *testing.T) {
	t.Parallel()

	_, err := NewNoopProvider().ClientSecret(context.Background(), ProviderStripe, "")
	if err == nil {
		t.Fatal("expected error for empty payment intent id")
	}
}

func TestSelectProviderForCurrency(t *testing.T) {
	t.Parallel()

	cfg := Config{
		MercadoPagoToken: "mp-token",
		WompiPrivateKey:  "wompi-key",
		PayUApiLogin:     "login",
		PayUApiKey:       "key",
		PayUMerchantID:   "merchant",
	}

	if got := SelectProviderForCurrency("COP", cfg); got != ProviderWompi {
		t.Fatalf("expected wompi for COP, got %s", got)
	}

	cfg.WompiPrivateKey = ""
	if got := SelectProviderForCurrency("COP", cfg); got != ProviderPayU {
		t.Fatalf("expected payu for COP without wompi, got %s", got)
	}

	cfg.PayUApiLogin = ""
	if got := SelectProviderForCurrency("COP", cfg); got != ProviderMercadoPago {
		t.Fatalf("expected mercadopago for COP fallback, got %s", got)
	}

	if got := SelectProviderForCurrency("MXN", cfg); got != ProviderMercadoPago {
		t.Fatalf("expected mercadopago for MXN, got %s", got)
	}

	if got := SelectProviderForCurrency("USD", cfg); got != ProviderStripe {
		t.Fatalf("expected stripe for USD, got %s", got)
	}
}

func TestIsRedirectProvider(t *testing.T) {
	t.Parallel()
	if !IsRedirectProvider(ProviderWompi) {
		t.Fatal("expected wompi to be redirect provider")
	}
	if IsRedirectProvider(ProviderStripe) {
		t.Fatal("stripe should not be redirect provider")
	}
}
