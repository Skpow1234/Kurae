package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestSoonWaitlistNotificationFlow(t *testing.T) {
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

	slug := "test-waitlist-soon-notify"
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, "waitlist-soon@test.local", "hash", "Waitlist Soon", slug)
	if err != nil {
		t.Fatal(err)
	}

	now := time.Now().UTC().Truncate(time.Second)
	startsAt := now.Add(12 * time.Hour)
	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "notify-soon",
		Title:          "Notify Soon Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       startsAt,
		EndsAt:         startsAt.Add(24 * time.Hour),
		PublishStatus:  domain.PublishScheduled,
	})
	if err != nil {
		t.Fatal(err)
	}

	_, _ = s.Pool().Exec(ctx, `UPDATE drops SET waitlist_count = 3 WHERE id = $1`, drop.ID)

	lead := 24 * time.Hour
	due, err := s.Drops().ListDueSoonWaitlistNotifications(ctx, now, lead)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, item := range due {
		if item.ID == drop.ID {
			found = true
			if !item.StartsAt.Equal(startsAt) {
				t.Fatalf("expected starts_at %v, got %v", startsAt, item.StartsAt)
			}
			break
		}
	}
	if !found {
		t.Fatal("expected drop in due soon waitlist notifications")
	}

	farFuture := now.Add(48 * time.Hour)
	dropFar, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "notify-soon-far",
		Title:          "Far Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       farFuture,
		EndsAt:         farFuture.Add(24 * time.Hour),
		PublishStatus:  domain.PublishScheduled,
	})
	if err != nil {
		t.Fatal(err)
	}
	_, _ = s.Pool().Exec(ctx, `UPDATE drops SET waitlist_count = 1 WHERE id = $1`, dropFar.ID)

	dueFar, err := s.Drops().ListDueSoonWaitlistNotifications(ctx, now, lead)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range dueFar {
		if item.ID == dropFar.ID {
			t.Fatal("drop outside lead window should not be due")
		}
	}

	claimed, err := s.Drops().MarkSoonWaitlistNotified(ctx, drop.ID)
	if err != nil || !claimed {
		t.Fatalf("expected to claim notification, claimed=%v err=%v", claimed, err)
	}

	claimedAgain, err := s.Drops().MarkSoonWaitlistNotified(ctx, drop.ID)
	if err != nil {
		t.Fatal(err)
	}
	if claimedAgain {
		t.Fatal("expected second claim to be false")
	}
}
