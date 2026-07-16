package config

import (
	"testing"
	"time"
)

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
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected stripe live key validation error")
	}

	cfg.StripeSecretKey = "sk_live_abc"
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected CORS_ORIGINS validation error")
	}

	cfg.corsOriginsExplicit = true
	cfg.CORSOrigins = []string{"http://localhost:3000"}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected non-localhost CORS validation error")
	}

	cfg.CORSOrigins = []string{"https://kurae.example.com"}
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

func TestValidateProductionStripe(t *testing.T) {
	t.Parallel()

	if err := validateProductionStripe("sk_test_abc"); err == nil {
		t.Fatal("expected test key rejection")
	}
	if err := validateProductionStripe("sk_live_abc"); err != nil {
		t.Fatalf("expected live key to pass, got %v", err)
	}
}

func TestParseCORSOrigins(t *testing.T) {
	t.Parallel()

	got := parseCORSOrigins(" https://a.com , ,https://b.com ")
	if len(got) != 2 || got[0] != "https://a.com" || got[1] != "https://b.com" {
		t.Fatalf("unexpected origins: %#v", got)
	}
}

func TestIsLocalhostOrigin(t *testing.T) {
	t.Parallel()

	if !isLocalhostOrigin("http://localhost:3000") {
		t.Fatal("expected localhost")
	}
	if isLocalhostOrigin("https://kurae.example.com") {
		t.Fatal("expected non-localhost")
	}
}

func TestLoadReservationTTL(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "dev-secret")
	t.Setenv("RESERVATION_TTL", "20m")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ReservationTTL != 20*time.Minute {
		t.Fatalf("expected 20m, got %s", cfg.ReservationTTL)
	}
}

func TestLoadReservationTTLDefaultsToFifteenMinutes(t *testing.T) {
	t.Setenv("ENV", "development")
	t.Setenv("DATABASE_URL", "postgres://test")
	t.Setenv("JWT_SECRET", "dev-secret")
	t.Setenv("RESERVATION_TTL", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ReservationTTL != DefaultReservationTTL {
		t.Fatalf("expected default %s, got %s", DefaultReservationTTL, cfg.ReservationTTL)
	}
}

func TestLoadRejectsInvalidReservationTTL(t *testing.T) {
	for _, value := range []string{"not-a-duration", "0s", "-1m"} {
		t.Run(value, func(t *testing.T) {
			t.Setenv("ENV", "development")
			t.Setenv("DATABASE_URL", "postgres://test")
			t.Setenv("JWT_SECRET", "dev-secret")
			t.Setenv("RESERVATION_TTL", value)

			if _, err := Load(); err == nil {
				t.Fatalf("expected RESERVATION_TTL=%q to fail", value)
			}
		})
	}
}
