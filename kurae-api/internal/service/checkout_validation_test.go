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
			name:      "scheduled rejected",
			drop:      func() domain.DropRecord { d := liveDrop; d.PublishStatus = domain.PublishScheduled; return d }(),
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

func TestValidateCheckoutProduct(t *testing.T) {
	now := time.Date(2026, 6, 15, 12, 0, 0, 0, time.UTC)
	start := now.Add(-time.Hour)
	end := now.Add(24 * time.Hour)

	liveDrop := domain.DropRecord{
		PublishStatus:      domain.PublishPublished,
		StartsAt:           start,
		EndsAt:             end,
		InventoryRemaining: 5,
		Sizes:              []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}

	product := domain.DropProduct{
		ID:                 "prod-1",
		InventoryRemaining: 3,
		Sizes: []domain.DropSize{
			{ID: "m", Label: "M", Available: true},
			{ID: "l", Label: "L", Available: false},
		},
	}

	tests := []struct {
		name      string
		drop      domain.DropRecord
		product   domain.DropProduct
		sizeLabel string
		wantErr   error
	}{
		{
			name:      "live product valid size",
			drop:      liveDrop,
			product:   product,
			sizeLabel: "M",
			wantErr:   nil,
		},
		{
			name: "product sold out",
			drop: liveDrop,
			product: func() domain.DropProduct {
				p := product
				p.InventoryRemaining = 0
				return p
			}(),
			sizeLabel: "M",
			wantErr:   store.ErrSoldOut,
		},
		{
			name:      "unavailable product size",
			drop:      liveDrop,
			product:   product,
			sizeLabel: "L",
			wantErr:   ErrInvalidSize,
		},
		{
			name:      "unknown product size",
			drop:      liveDrop,
			product:   product,
			sizeLabel: "XL",
			wantErr:   ErrInvalidSize,
		},
		{
			name: "empty product sizes skips size check",
			drop: liveDrop,
			product: func() domain.DropProduct {
				p := product
				p.Sizes = nil
				return p
			}(),
			sizeLabel: "anything",
			wantErr:   nil,
		},
		{
			name: "draft drop rejected",
			drop: func() domain.DropRecord {
				d := liveDrop
				d.PublishStatus = domain.PublishDraft
				return d
			}(),
			product:   product,
			sizeLabel: "M",
			wantErr:   ErrDropNotCheckoutable,
		},
		{
			name: "upcoming drop rejected",
			drop: func() domain.DropRecord {
				d := liveDrop
				d.StartsAt = now.Add(time.Hour)
				return d
			}(),
			product:   product,
			sizeLabel: "M",
			wantErr:   ErrDropNotStarted,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			err := validateCheckoutProduct(tc.drop, tc.product, tc.sizeLabel, now)
			if tc.wantErr == nil {
				if err != nil {
					t.Fatalf("expected nil, got %v", err)
				}
				return
			}
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}
