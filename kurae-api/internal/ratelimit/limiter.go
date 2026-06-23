package ratelimit

import (
	"net/http"
	"strings"
	"sync"
	"time"
)

type Limiter struct {
	limit  int
	window time.Duration
	peers  sync.Map
}

type bucket struct {
	mu         sync.Mutex
	timestamps []time.Time
}

func NewIP(limit int, window time.Duration) *Limiter {
	return &Limiter{limit: limit, window: window}
}

func (l *Limiter) Allow(key string) bool {
	key = strings.TrimSpace(key)
	if key == "" {
		key = "unknown"
	}

	val, _ := l.peers.LoadOrStore(key, &bucket{})
	b := val.(*bucket)

	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)
	filtered := b.timestamps[:0]
	for _, ts := range b.timestamps {
		if ts.After(cutoff) {
			filtered = append(filtered, ts)
		}
	}
	if len(filtered) >= l.limit {
		return false
	}
	b.timestamps = append(filtered, now)
	return true
}

func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	host := r.RemoteAddr
	if i := strings.LastIndex(host, ":"); i >= 0 {
		return host[:i]
	}
	return strings.TrimSpace(host)
}
