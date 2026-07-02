package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

const (
	DefaultPort                  = "8080"
	DefaultReservationTTL        = 15 * time.Minute
	DefaultWaitlistRatePerMinute = 5
	minJWTSecretLen              = 32
)

type Config struct {
	Port            string
	Environment     string
	DatabaseURL     string
	RedisURL        string
	JWTSecret       string
	CORSOrigins     []string
	StripeSecretKey string
	StripeWebhook   string
	S3Bucket        string
	S3Region        string
	AWSAccessKey    string
	AWSSecretKey    string
	ReservationTTL  time.Duration
	ResendAPIKey    string
	PostmarkToken   string
	EmailFrom       string
	PublicWebURL    string

	corsOriginsExplicit bool
}

func (c Config) IsProduction() bool {
	return strings.EqualFold(c.Environment, "production")
}

func (c Config) HasEmailProvider() bool {
	return strings.TrimSpace(c.ResendAPIKey) != "" || strings.TrimSpace(c.PostmarkToken) != ""
}

func Load() (Config, error) {
	cfg := Config{
		Port:            envOr("PORT", DefaultPort),
		Environment:     envOr("ENV", "development"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		RedisURL:        os.Getenv("REDIS_URL"),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		StripeSecretKey: os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhook:   os.Getenv("STRIPE_WEBHOOK_SECRET"),
		S3Bucket:        os.Getenv("S3_BUCKET"),
		S3Region:        os.Getenv("S3_REGION"),
		AWSAccessKey:    os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretKey:    os.Getenv("AWS_SECRET_ACCESS_KEY"),
		ReservationTTL:  DefaultReservationTTL,
		ResendAPIKey:    os.Getenv("RESEND_API_KEY"),
		PostmarkToken:   os.Getenv("POSTMARK_SERVER_TOKEN"),
		EmailFrom:       envOr("EMAIL_FROM", "orders@kurae.dev"),
	}

	origins := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
	if origins == "" {
		cfg.CORSOrigins = []string{"http://localhost:3000"}
	} else {
		cfg.corsOriginsExplicit = true
		cfg.CORSOrigins = parseCORSOrigins(origins)
	}

	cfg.PublicWebURL = strings.TrimSpace(os.Getenv("PUBLIC_WEB_URL"))
	if cfg.PublicWebURL == "" && len(cfg.CORSOrigins) > 0 {
		cfg.PublicWebURL = cfg.CORSOrigins[0]
	}
	if cfg.PublicWebURL == "" {
		cfg.PublicWebURL = "http://localhost:3000"
	}

	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return cfg, fmt.Errorf("JWT_SECRET is required")
	}

	if err := cfg.Validate(); err != nil {
		return cfg, err
	}

	return cfg, nil
}

func (c Config) Validate() error {
	if c.IsProduction() {
		if c.JWTSecret == "change-me-in-production" || len(c.JWTSecret) < minJWTSecretLen {
			return fmt.Errorf("JWT_SECRET must be at least %d characters in production", minJWTSecretLen)
		}
		if c.StripeSecretKey == "" {
			return fmt.Errorf("STRIPE_SECRET_KEY is required in production")
		}
		if c.StripeWebhook == "" {
			return fmt.Errorf("STRIPE_WEBHOOK_SECRET is required in production")
		}
		if strings.TrimSpace(c.RedisURL) == "" {
			return fmt.Errorf("REDIS_URL is required in production")
		}
		if !c.HasEmailProvider() {
			return fmt.Errorf("RESEND_API_KEY or POSTMARK_SERVER_TOKEN is required in production")
		}
		if err := validateProductionStripe(c.StripeSecretKey); err != nil {
			return err
		}
		if err := validateProductionCORS(c.corsOriginsExplicit, c.CORSOrigins); err != nil {
			return err
		}
	}
	return nil
}

func validateProductionStripe(secretKey string) error {
	if strings.HasPrefix(secretKey, "sk_test_") {
		return fmt.Errorf("STRIPE_SECRET_KEY must not be a test key in production")
	}
	if !strings.HasPrefix(secretKey, "sk_live_") {
		return fmt.Errorf("STRIPE_SECRET_KEY must be a live key (sk_live_) in production")
	}
	return nil
}

func validateProductionCORS(explicit bool, origins []string) error {
	if !explicit {
		return fmt.Errorf("CORS_ORIGINS must be set explicitly in production")
	}
	if len(origins) == 0 {
		return fmt.Errorf("CORS_ORIGINS must include at least one origin in production")
	}
	for _, origin := range origins {
		if !isLocalhostOrigin(origin) {
			return nil
		}
	}
	return fmt.Errorf("CORS_ORIGINS must include a non-localhost origin in production")
}

func isLocalhostOrigin(origin string) bool {
	origin = strings.ToLower(strings.TrimSpace(origin))
	return strings.HasPrefix(origin, "http://localhost:") ||
		strings.HasPrefix(origin, "https://localhost:") ||
		strings.HasPrefix(origin, "http://127.0.0.1:") ||
		strings.HasPrefix(origin, "https://127.0.0.1:")
}

func parseCORSOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
