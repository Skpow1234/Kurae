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
)

type Config struct {
	Port            string
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
}

func Load() (Config, error) {
	cfg := Config{
		Port:            envOr("PORT", DefaultPort),
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
	}

	origins := strings.TrimSpace(os.Getenv("CORS_ORIGINS"))
	if origins == "" {
		cfg.CORSOrigins = []string{"http://localhost:3000"}
	} else {
		cfg.CORSOrigins = strings.Split(origins, ",")
	}

	if cfg.DatabaseURL == "" {
		return cfg, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.JWTSecret == "" {
		return cfg, fmt.Errorf("JWT_SECRET is required")
	}

	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
