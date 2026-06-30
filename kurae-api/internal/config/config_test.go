package config

import "testing"

func TestValidateProductionGuards(t *testing.T) {
	t.Parallel()

	cfg := Config{
		Environment:     "production",
		DatabaseURL:     "postgres://example",
		JWTSecret:       "change-me-in-production",
		StripeSecretKey: "sk_test",
		StripeWebhook:   "whsec_test",
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected JWT secret validation error")
	}

	cfg.JWTSecret = "this-is-a-secure-production-jwt-secret-key"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected REDIS_URL validation error")
	}

	cfg.RedisURL = "redis://localhost:6379"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected email provider validation error")
	}

	cfg.ResendAPIKey = "re_test"
	if err := cfg.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateDevelopmentAllowsNoStripe(t *testing.T) {
	t.Parallel()

	cfg := Config{
		Environment: "development",
		JWTSecret:   "dev-secret",
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
