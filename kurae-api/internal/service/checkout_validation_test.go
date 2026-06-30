package service

import (
	"errors"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestValidateCheckoutDrop(t *testing.T) {
	now := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
	start := now.Add(-time.Hour)
	end := now.Add(24 * time.Hour)
	sizes := []domain.DropSize{
		{ID: "m", Label: "M", Available: true},
		{ID: "l", Label: "L", Available: false},
	}

	liveDrop := domain.DropRecord{
		PublishStatus:      domain.PublishPublished,
		StartsAt:           start,
		EndsAt:             end,
		InventoryRemaining: 5,
		Sizes:              sizes,
	}

	tests := []struct {
		name      string
		drop      domain.DropRecord
		sizeLabel string
		wantErr   error
	}{
		{
			name:      "live published drop valid size",
			drop:      liveDrop,
			sizeLabel: "M",
			wantErr:   nil,
		},
		{
			name:      "size label case insensitive",
			drop:      liveDrop,
			sizeLabel: "m",
			wantErr:   nil,
		},
		{
			name:      "draft rejected",
			drop:      func() domain.DropRecord { d := liveDrop; d.PublishStatus = domain.PublishDraft; return d }(),
			sizeLabel: "M",
			wantErr:   ErrDropNotCheckoutable,
		},
		{
			name:      "upcoming rejected",
			drop:      func() domain.DropRecord { d := liveDrop; d.StartsAt = now.Add(time.Hour); return d }(),
			sizeLabel: "M",
			wantErr:   ErrDropNotStarted,
		},
		{
			name:      "expired rejected",
			drop:      func() domain.DropRecord { d := liveDrop; d.EndsAt = now.Add(-time.Minute); return d }(),
			sizeLabel: "M",
			wantErr:   ErrDropEnded,
		},
		{
			name:      "sold out rejected",
			drop:      func() domain.DropRecord { d := liveDrop; d.InventoryRemaining = 0; return d }(),
			sizeLabel: "M",
			wantErr:   store.ErrSoldOut,
		},
		{
			name:      "unavailable size rejected",
			drop:      liveDrop,
			sizeLabel: "L",
			wantErr:   ErrInvalidSize,
		},
		{
			name:      "unknown size rejected",
			drop:      liveDrop,
			sizeLabel: "XL",
			wantErr:   ErrInvalidSize,
		},
		{
			name:      "empty size rejected",
			drop:      liveDrop,
			sizeLabel: "  ",
			wantErr:   ErrInvalidSize,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateCheckoutDrop(tc.drop, tc.sizeLabel, now)
			if tc.wantErr == nil {
				if err != nil {
					t.Fatalf("expected nil error, got %v", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}
