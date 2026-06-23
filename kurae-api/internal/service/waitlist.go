package service

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/kurae/kurae-api/internal/store"
)

type WaitlistService struct {
	waitlist *store.WaitlistRepository
	drops    *store.DropRepository
	limiters sync.Map
}

func NewWaitlistService(s *store.Store) *WaitlistService {
	return &WaitlistService{
		waitlist: s.Waitlist(),
		drops:    s.Drops(),
	}
}

var ErrRateLimited = errors.New("rate limited")

func (w *WaitlistService) Join(ctx context.Context, dropID, email, clientIP string) error {
	if err := w.checkRateLimit(clientIP); err != nil {
		return err
	}

	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return errors.New("email required")
	}

	exists, err := w.waitlist.Exists(ctx, dropID)
	if err != nil {
		return err
	}
	if !exists {
		return store.ErrNotFound
	}

	inserted, err := w.waitlist.Join(ctx, dropID, email)
	if err != nil {
		return err
	}
	if inserted {
		return w.drops.IncrementWaitlistCount(ctx, dropID)
	}
	return nil
}

type ipBucket struct {
	mu       sync.Mutex
	timestamps []time.Time
}

func (w *WaitlistService) checkRateLimit(ip string) error {
	const limit = 5
	const window = time.Minute

	val, _ := w.limiters.LoadOrStore(ip, &ipBucket{})
	bucket := val.(*ipBucket)

	bucket.mu.Lock()
	defer bucket.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)
	filtered := bucket.timestamps[:0]
	for _, ts := range bucket.timestamps {
		if ts.After(cutoff) {
			filtered = append(filtered, ts)
		}
	}
	if len(filtered) >= limit {
		return ErrRateLimited
	}
	bucket.timestamps = append(filtered, now)
	return nil
}
