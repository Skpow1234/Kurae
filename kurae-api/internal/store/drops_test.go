package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestDeleteDropForSeller(t *testing.T) {
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

	slug := "test-delete-drop"
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, "delete@test.local", "hash", "Delete Test", slug)
	if err != nil {
		t.Fatal(err)
	}

	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "deletable",
		Title:          "Deletable Drop",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       time.Now().Add(-time.Hour),
		EndsAt:         time.Now().Add(24 * time.Hour),
		PublishStatus:  domain.PublishDraft,
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := s.Drops().DeleteForSeller(ctx, drop.ID, seller.ID); err != nil {
		t.Fatalf("delete without orders: %v", err)
	}

	_, err = s.Drops().GetByIDForSeller(ctx, drop.ID, seller.ID)
	if err != store.ErrNotFound {
		t.Fatalf("expected not found after delete, got %v", err)
	}
}

func TestDeleteDropBlockedWhenOrdersExist(t *testing.T) {
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

	slug := "test-delete-blocked"
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, "delete-blocked@test.local", "hash", "Blocked", slug)
	if err != nil {
		t.Fatal(err)
	}

	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "has-orders",
		Title:          "Has Orders",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       time.Now().Add(-time.Hour),
		EndsAt:         time.Now().Add(24 * time.Hour),
		PublishStatus:  domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Products().ReplaceForDrop(ctx, drop.ID, seller.ID, []store.ProductInput{{
		Slug:           "default",
		Name:           "Has Orders",
		PriceCents:     1000,
		InventoryTotal: 5,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}}); err != nil {
		t.Fatal(err)
	}
	products, err := s.Products().ListByDropID(ctx, drop.ID)
	if err != nil || len(products) == 0 {
		t.Fatal("expected product")
	}

	_, err = s.Orders().ReserveInventory(ctx, store.CheckoutInput{
		SellerID:       seller.ID,
		DropID:         drop.ID,
		ProductID:      products[0].ID,
		ProductName:    products[0].Name,
		BuyerEmail:     "buyer@test.local",
		SizeLabel:      "M",
		SubtotalCents:  1000,
		Currency:       "USD",
		IdempotencyKey: "delete-blocked-key",
		ExpiresAt:      time.Now().Add(15 * time.Minute),
	})
	if err != nil {
		t.Fatal(err)
	}

	err = s.Drops().DeleteForSeller(ctx, drop.ID, seller.ID)
	if err != store.ErrDropHasOrders {
		t.Fatalf("expected ErrDropHasOrders, got %v", err)
	}
}
