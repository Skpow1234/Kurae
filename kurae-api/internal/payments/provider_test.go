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

	secret, err := provider.ClientSecret(ctx, intent.ID)
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

	_, err := NewNoopProvider().ClientSecret(context.Background(), "")
	if err == nil {
		t.Fatal("expected error for empty payment intent id")
	}
}
