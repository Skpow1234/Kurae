package service

import (
	"context"

	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
)

type WaitlistService struct {
	waitlist *store.WaitlistRepository
	drops    *store.DropRepository
}

func NewWaitlistService(s *store.Store) *WaitlistService {
	return &WaitlistService{
		waitlist: s.Waitlist(),
		drops:    s.Drops(),
	}
}

func (w *WaitlistService) Join(ctx context.Context, dropID, email string) (int, error) {
	email, err := validate.NormalizeEmail(email)
	if err != nil {
		return 0, err
	}

	exists, err := w.waitlist.Exists(ctx, dropID)
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, store.ErrNotFound
	}

	inserted, err := w.waitlist.Join(ctx, dropID, email)
	if err != nil {
		return 0, err
	}
	if inserted {
		if err := w.drops.IncrementWaitlistCount(ctx, dropID); err != nil {
			return 0, err
		}
	}

	return w.waitlist.CountByDrop(ctx, dropID)
}
