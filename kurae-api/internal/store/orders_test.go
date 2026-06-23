package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestReserveInventorySoldOutRace(t *testing.T) {
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

	// Ensure clean slate for test seller slug
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = 'test-inventory'`)

	seller, err := s.Sellers().Create(ctx, "inventory@test.local", "hash", "Test", "test-inventory")
	if err != nil {
		t.Fatal(err)
	}

	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "race-drop",
		Title:          "Race Drop",
		PriceCents:     1000,
		InventoryTotal: 1,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       time.Now().Add(-time.Hour),
		EndsAt:         time.Now().Add(24 * time.Hour),
		PublishStatus:  domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}

	type result struct {
		err error
	}
	ch := make(chan result, 2)
	for i := 0; i < 2; i++ {
		go func(n int) {
			_, err := s.Orders().ReserveInventory(ctx, store.CheckoutInput{
				SellerID:       seller.ID,
				DropID:         drop.ID,
				BuyerEmail:     "buyer@test.local",
				SizeLabel:      "M",
				AmountCents:    1000,
				Currency:       "USD",
				IdempotencyKey: "key-" + string(rune('a'+n)),
				ExpiresAt:      time.Now().Add(15 * time.Minute),
			})
			ch <- result{err: err}
		}(i)
	}

	var successes, soldOut int
	for i := 0; i < 2; i++ {
		r := <-ch
		switch {
		case r.err == nil:
			successes++
		case r.err == store.ErrSoldOut:
			soldOut++
		default:
			t.Fatalf("unexpected error: %v", r.err)
		}
	}

	if successes != 1 || soldOut != 1 {
		t.Fatalf("want 1 success and 1 sold out, got success=%d soldOut=%d", successes, soldOut)
	}
}

func TestWebhookEventIdempotency(t *testing.T) {
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

	payload := []byte(`{"id":"evt_test_123","type":"payment_intent.succeeded"}`)
	inserted, err := s.Orders().SaveWebhookEvent(ctx, "stripe", "evt_test_123", payload)
	if err != nil {
		t.Fatal(err)
	}
	if !inserted {
		t.Fatal("expected first webhook insert")
	}

	inserted, err = s.Orders().SaveWebhookEvent(ctx, "stripe", "evt_test_123", payload)
	if err != nil {
		t.Fatal(err)
	}
	if inserted {
		t.Fatal("expected duplicate webhook to be ignored")
	}
}
