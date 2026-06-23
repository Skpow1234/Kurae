package ratelimit

import (
	"testing"
	"time"
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
