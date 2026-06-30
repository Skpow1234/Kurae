package service

import (
	"errors"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

var (
	ErrDropNotCheckoutable = errors.New("drop not available for checkout")
	ErrDropNotStarted      = errors.New("drop has not started")
	ErrDropEnded           = errors.New("drop has ended")
	ErrInvalidSize         = errors.New("invalid size")
)

func validateCheckoutDrop(drop domain.DropRecord, sizeLabel string, now time.Time) error {
	if drop.PublishStatus != domain.PublishPublished {
		return ErrDropNotCheckoutable
	}

	status := domain.ResolveDropStatus(drop.StartsAt, drop.EndsAt, drop.InventoryRemaining, now)
	switch status {
	case domain.DropStatusLive:
	case domain.DropStatusSoldOut:
		return store.ErrSoldOut
	case domain.DropStatusUpcoming:
		return ErrDropNotStarted
	case domain.DropStatusExpired:
		return ErrDropEnded
	default:
		return ErrDropNotCheckoutable
	}

	if !sizeAvailable(drop.Sizes, sizeLabel) {
		return ErrInvalidSize
	}
	return nil
}

func sizeAvailable(sizes []domain.DropSize, label string) bool {
	label = strings.TrimSpace(label)
	if label == "" {
		return false
	}
	for _, s := range sizes {
		if strings.EqualFold(strings.TrimSpace(s.Label), label) && s.Available {
			return true
		}
	}
	return false
}
