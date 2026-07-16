package ratelimit

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type Limiter struct {
	limit      int
	window     time.Duration
	scope      string
	peers      sync.Map
	rdb        redis.Cmdable
	failClosed bool
}

type bucket struct {
	mu         sync.Mutex
	timestamps []time.Time
}

// NewIP creates a process-local sliding-window limiter (dev fallback / tests).
func NewIP(limit int, window time.Duration) *Limiter {
	return &Limiter{limit: limit, window: window, scope: "local"}
}

// NewDistributed creates a Redis-backed sliding-window limiter shared across API instances.
// When rdb is nil, falls back to in-memory.
// failClosed: on Redis errors deny the request (production). When false, fall back to memory (dev).
func NewDistributed(rdb redis.Cmdable, scope string, limit int, window time.Duration, failClosed bool) *Limiter {
	scope = strings.TrimSpace(scope)
	if scope == "" {
		scope = "default"
	}
	return &Limiter{
		limit:      limit,
		window:     window,
		scope:      scope,
		rdb:        rdb,
		failClosed: failClosed,
	}
}

func (l *Limiter) Allow(key string) bool {
	key = strings.TrimSpace(key)
	if key == "" {
		key = "unknown"
	}

	if l.rdb != nil {
		ok, err := l.allowRedis(key)
		if err == nil {
			return ok
		}
		if l.failClosed {
			log.Printf("ratelimit redis error scope=%s: %v (denying)", l.scope, err)
			return false
		}
		log.Printf("ratelimit redis error scope=%s: %v (memory fallback)", l.scope, err)
	}

	return l.allowMemory(key)
}

func (l *Limiter) allowMemory(key string) bool {
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

// Lua sliding window: prune old members, deny if at limit, else ZADD + PEXPIRE.
var slidingWindowScript = redis.NewScript(`
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  return 0
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return 1
`)

func (l *Limiter) allowRedis(key string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	now := time.Now().UnixMilli()
	windowMs := l.window.Milliseconds()
	if windowMs < 1 {
		windowMs = 1
	}
	redisKey := fmt.Sprintf("kurae:rl:%s:%s", l.scope, key)
	member := fmt.Sprintf("%d-%s", now, uuid.NewString())

	result, err := slidingWindowScript.Run(ctx, l.rdb, []string{redisKey}, now, windowMs, l.limit, member).Int()
	if err != nil {
		return false, err
	}
	return result == 1, nil
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
