package ratelimit

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

func TestLimiterBlocksAfterLimit(t *testing.T) {
	t.Parallel()

	limiter := NewIP(2, time.Minute)
	if !limiter.Allow("1.2.3.4") || !limiter.Allow("1.2.3.4") {
		t.Fatal("expected first two requests to pass")
	}
	if limiter.Allow("1.2.3.4") {
		t.Fatal("expected third request to be blocked")
	}
}

func TestLimiterIsPerIP(t *testing.T) {
	t.Parallel()

	limiter := NewIP(1, time.Minute)
	if !limiter.Allow("1.2.3.4") {
		t.Fatal("expected first IP request to pass")
	}
	if !limiter.Allow("5.6.7.8") {
		t.Fatal("expected different IP to have its own bucket")
	}
}

func TestDistributedFallbackToMemoryOnRedisError(t *testing.T) {
	t.Parallel()

	// Unreachable Redis — should fall back to memory when failClosed=false.
	client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = client.Close() })

	limiter := NewDistributed(client, "fallback-"+uuid.NewString()[:8], 2, time.Minute, false)
	if !limiter.Allow("10.0.0.1") || !limiter.Allow("10.0.0.1") {
		t.Fatal("expected memory fallback to allow first two")
	}
	if limiter.Allow("10.0.0.1") {
		t.Fatal("expected memory fallback to block third")
	}
}

func TestDistributedFailClosedOnRedisError(t *testing.T) {
	t.Parallel()

	client := redis.NewClient(&redis.Options{Addr: "127.0.0.1:1"})
	t.Cleanup(func() { _ = client.Close() })

	limiter := NewDistributed(client, "failclosed-"+uuid.NewString()[:8], 10, time.Minute, true)
	if limiter.Allow("10.0.0.2") {
		t.Fatal("expected fail-closed to deny when Redis is down")
	}
}

func TestDistributedRedisSharedAcrossLimiters(t *testing.T) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		t.Skip("REDIS_URL not set")
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		t.Fatal(err)
	}
	client := redis.NewClient(opts)
	t.Cleanup(func() { _ = client.Close() })

	scope := "shared-" + uuid.NewString()[:8]
	a := NewDistributed(client, scope, 2, time.Minute, true)
	b := NewDistributed(client, scope, 2, time.Minute, true)

	ip := "203.0.113." + uuid.NewString()[:2]
	if !a.Allow(ip) {
		t.Fatal("expected first allow on instance A")
	}
	if !b.Allow(ip) {
		t.Fatal("expected second allow on instance B (shared counter)")
	}
	if a.Allow(ip) || b.Allow(ip) {
		t.Fatal("expected third request blocked on both instances")
	}
}

func TestDistributedScopesAreIsolated(t *testing.T) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		t.Skip("REDIS_URL not set")
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		t.Fatal(err)
	}
	client := redis.NewClient(opts)
	t.Cleanup(func() { _ = client.Close() })

	suffix := uuid.NewString()[:8]
	auth := NewDistributed(client, "auth-"+suffix, 1, time.Minute, true)
	checkout := NewDistributed(client, "checkout-"+suffix, 1, time.Minute, true)

	ip := "198.51.100.10"
	if !auth.Allow(ip) {
		t.Fatal("expected auth allow")
	}
	if !checkout.Allow(ip) {
		t.Fatal("expected checkout allow (separate scope)")
	}
	if auth.Allow(ip) {
		t.Fatal("expected auth blocked on second")
	}
	if checkout.Allow(ip) {
		t.Fatal("expected checkout blocked on second")
	}
}
