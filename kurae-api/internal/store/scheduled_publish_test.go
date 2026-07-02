package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestPublishDueScheduled(t *testing.T) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}

	ctx := context.Background()
	s, err := store.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()

	slug := "test-scheduled-publish"
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, "scheduled@test.local", "hash", "Scheduled Seller", slug)
	if err != nil {
		t.Fatal(err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	dueDrop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "due",
		Title:          "Due Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       now.Add(-time.Minute),
		EndsAt:         now.Add(24 * time.Hour),
		PublishStatus:  domain.PublishScheduled,
	})
	if err != nil {
		t.Fatal(err)
	}

	futureDrop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "future",
		Title:          "Future Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       now.Add(2 * time.Hour),
		EndsAt:         now.Add(48 * time.Hour),
		PublishStatus:  domain.PublishScheduled,
	})
	if err != nil {
		t.Fatal(err)
	}

	n, err := s.Drops().PublishDueScheduled(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 published drop, got %d", n)
	}

	due, err := s.Drops().GetByIDForSeller(ctx, dueDrop.ID, seller.ID)
	if err != nil {
		t.Fatal(err)
	}
	if due.PublishStatus != domain.PublishPublished {
		t.Fatalf("due drop publish status = %q, want published", due.PublishStatus)
	}

	future, err := s.Drops().GetByIDForSeller(ctx, futureDrop.ID, seller.ID)
	if err != nil {
		t.Fatal(err)
	}
	if future.PublishStatus != domain.PublishScheduled {
		t.Fatalf("future drop publish status = %q, want scheduled", future.PublishStatus)
	}
}
