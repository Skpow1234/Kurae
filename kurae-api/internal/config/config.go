package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/payments"
)

const (
	DefaultPort                       = "8080"
	DefaultReservationTTL             = 15 * time.Minute
	DefaultWaitlistSoonNotifyBefore   = 24 * time.Hour
	DefaultWaitlistRatePerMinute      = 5
	minJWTSecretLen                   = 32
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
	MercadoPagoAccessToken   string
	MercadoPagoWebhookSecret string
	WompiPrivateKey          string
	WompiEventsSecret        string
	PayUApiLogin             string
	PayUApiKey               string
	PayUMerchantID           string
	PayUAccountID            string
	APIPublicURL             string
	S3Bucket        string
	S3Region        string
	AWSAccessKey    string
	AWSSecretKey    string
	ReservationTTL             time.Duration
	WaitlistSoonNotifyBefore   time.Duration
	ResendAPIKey               string
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
		StripeSecretKey:          os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhook:            os.Getenv("STRIPE_WEBHOOK_SECRET"),
		MercadoPagoAccessToken:   os.Getenv("MERCADOPAGO_ACCESS_TOKEN"),
		MercadoPagoWebhookSecret: os.Getenv("MERCADOPAGO_WEBHOOK_SECRET"),
		WompiPrivateKey:          os.Getenv("WOMPI_PRIVATE_KEY"),
		WompiEventsSecret:        os.Getenv("WOMPI_EVENTS_SECRET"),
		PayUApiLogin:             os.Getenv("PAYU_API_LOGIN"),
		PayUApiKey:               os.Getenv("PAYU_API_KEY"),
		PayUMerchantID:           os.Getenv("PAYU_MERCHANT_ID"),
		PayUAccountID:            os.Getenv("PAYU_ACCOUNT_ID"),
		S3Bucket:        os.Getenv("S3_BUCKET"),
		S3Region:        os.Getenv("S3_REGION"),
		AWSAccessKey:    os.Getenv("AWS_ACCESS_KEY_ID"),
		AWSSecretKey:    os.Getenv("AWS_SECRET_ACCESS_KEY"),
		ReservationTTL:           DefaultReservationTTL,
		WaitlistSoonNotifyBefore: DefaultWaitlistSoonNotifyBefore,
		ResendAPIKey:             os.Getenv("RESEND_API_KEY"),
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

	cfg.APIPublicURL = strings.TrimSpace(os.Getenv("API_PUBLIC_URL"))
	if cfg.APIPublicURL == "" {
		cfg.APIPublicURL = fmt.Sprintf("http://localhost:%s", cfg.Port)
	}

	if raw := strings.TrimSpace(os.Getenv("WAITLIST_SOON_NOTIFY_BEFORE")); raw != "" {
		d, err := time.ParseDuration(raw)
		if err != nil {
			return cfg, fmt.Errorf("WAITLIST_SOON_NOTIFY_BEFORE: %w", err)
		}
		if d <= 0 {
			return cfg, fmt.Errorf("WAITLIST_SOON_NOTIFY_BEFORE must be positive")
		}
		cfg.WaitlistSoonNotifyBefore = d
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

func (c Config) PaymentsConfig() payments.Config {
	return payments.Config{
		StripeSecretKey:          c.StripeSecretKey,
		StripeWebhook:            c.StripeWebhook,
		MercadoPagoToken:         c.MercadoPagoAccessToken,
		MercadoPagoWebhookSecret: c.MercadoPagoWebhookSecret,
		WompiPrivateKey:          c.WompiPrivateKey,
		WompiEventsSecret:        c.WompiEventsSecret,
		PayUApiLogin:             c.PayUApiLogin,
		PayUApiKey:               c.PayUApiKey,
		PayUMerchantID:           c.PayUMerchantID,
		PayUAccountID:            c.PayUAccountID,
		PublicWebURL:             c.PublicWebURL,
		APIPublicURL:             c.APIPublicURL,
		Production:               c.IsProduction(),
	}
}
