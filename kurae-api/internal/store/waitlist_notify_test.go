package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestLiveWaitlistNotificationFlow(t *testing.T) {
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

	slug := "test-waitlist-live-notify"
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, "waitlist-live@test.local", "hash", "Waitlist Live", slug)
	if err != nil {
		t.Fatal(err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "notify-live",
		Title:          "Notify Live Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       now.Add(-time.Minute),
		EndsAt:         now.Add(24 * time.Hour),
		PublishStatus:  domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}

	_, _ = s.Pool().Exec(ctx, `UPDATE drops SET waitlist_count = 2 WHERE id = $1`, drop.ID)

	due, err := s.Drops().ListDueLiveWaitlistNotifications(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range due {
		if item.ID == drop.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatal("expected drop in due live waitlist notifications")
	}

	claimed, err := s.Drops().MarkLiveWaitlistNotified(ctx, drop.ID)
	if err != nil || !claimed {
		t.Fatalf("expected to claim notification, claimed=%v err=%v", claimed, err)
	}

	claimedAgain, err := s.Drops().MarkLiveWaitlistNotified(ctx, drop.ID)
	if err != nil {
		t.Fatal(err)
	}
	if claimedAgain {
		t.Fatal("expected second claim to be false")
	}
}
