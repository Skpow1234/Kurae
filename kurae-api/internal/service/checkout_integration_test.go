package service_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

func TestCheckoutGuardsRejectUnavailableDrops(t *testing.T) {
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

	slug := "test-checkout-guards-" + uuid.NewString()[:8]
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, slug+"@test.local", "hash", "Guards", slug)
	if err != nil {
		t.Fatal(err)
	}

	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	shipping := domain.ShippingAddress{
		Name: "Test Buyer", Line1: "123 Main St", City: "NYC",
		Region: "NY", PostalCode: "10001", Country: "US",
	}

	cases := []struct {
		name      string
		mutate    func(*store.CreateDropInput)
		inventory int
		size      string
		wantErr   error
	}{
		{
			name: "draft",
			mutate: func(in *store.CreateDropInput) {
				in.PublishStatus = domain.PublishDraft
			},
			inventory: 5,
			size:      "M",
			wantErr:   service.ErrDropNotCheckoutable,
		},
		{
			name: "upcoming",
			mutate: func(in *store.CreateDropInput) {
				in.StartsAt = time.Now().Add(2 * time.Hour)
				in.EndsAt = time.Now().Add(48 * time.Hour)
			},
			inventory: 5,
			size:      "M",
			wantErr:   service.ErrDropNotStarted,
		},
		{
			name: "ended",
			mutate: func(in *store.CreateDropInput) {
				in.StartsAt = time.Now().Add(-48 * time.Hour)
				in.EndsAt = time.Now().Add(-time.Hour)
			},
			inventory: 5,
			size:      "M",
			wantErr:   service.ErrDropEnded,
		},
		{
			name:      "sold out",
			mutate:    func(in *store.CreateDropInput) {},
			inventory: 0,
			size:      "M",
			wantErr:   store.ErrSoldOut,
		},
		{
			name:      "invalid size",
			mutate:    func(in *store.CreateDropInput) {},
			inventory: 5,
			size:      "XXL",
			wantErr:   service.ErrInvalidSize,
		},
	}

	for i, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			in := store.CreateDropInput{
				SellerID:       seller.ID,
				Slug:           "guard-" + tc.name,
				Title:          "Guard " + tc.name,
				PriceCents:     1000,
				InventoryTotal: tc.inventory,
				Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
				StartsAt:       time.Now().Add(-time.Hour),
				EndsAt:         time.Now().Add(24 * time.Hour),
				PublishStatus:  domain.PublishPublished,
			}
			tc.mutate(&in)

			drop, err := s.Drops().Create(ctx, in)
			if err != nil {
				t.Fatal(err)
			}
			if err := s.Products().ReplaceForDrop(ctx, drop.ID, seller.ID, []store.ProductInput{{
				Slug:           "default",
				Name:           drop.Title,
				PriceCents:     1000,
				InventoryTotal: tc.inventory,
				Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
			}}); err != nil {
				t.Fatal(err)
			}
			products, err := s.Products().ListByDropID(ctx, drop.ID)
			if err != nil || len(products) == 0 {
				t.Fatal("expected product")
			}

			_, err = orderSvc.Checkout(ctx, service.CheckoutRequest{
				DropID:         drop.ID,
				ProductID:      products[0].ID,
				BuyerEmail:     "buyer@test.local",
				SizeLabel:      tc.size,
				IdempotencyKey: "guard-key-" + tc.name + string(rune('a'+i)),
				ShippingAddress: shipping,
			})
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}

func TestMarkPaidViaOrderService(t *testing.T) {
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

	slug := "test-service-mark-paid-" + uuid.NewString()[:8]
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, slug+"@test.local", "hash", "MarkPaid", slug)
	if err != nil {
		t.Fatal(err)
	}
	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "paid-drop",
		Title:          "Paid Drop",
		PriceCents:     1000,
		InventoryTotal: 2,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt:       time.Now().Add(-time.Hour),
		EndsAt:         time.Now().Add(24 * time.Hour),
		PublishStatus:  domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Products().ReplaceForDrop(ctx, drop.ID, seller.ID, []store.ProductInput{{
		Slug: "default", Name: "Paid Drop", PriceCents: 1000, InventoryTotal: 2,
		Sizes: []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}}); err != nil {
		t.Fatal(err)
	}
	products, err := s.Products().ListByDropID(ctx, drop.ID)
	if err != nil || len(products) == 0 {
		t.Fatal("expected product")
	}

	result, err := s.Orders().ReserveInventory(ctx, store.CheckoutInput{
		SellerID: seller.ID, DropID: drop.ID, ProductID: products[0].ID, ProductName: "Paid Drop",
		BuyerEmail: "buyer@test.local", SizeLabel: "M", SubtotalCents: 1000, Currency: "USD",
		IdempotencyKey: "svc-paid-" + uuid.NewString(),
		ShippingAddress: domain.ShippingAddress{
			Name: "Test Buyer", Line1: "123 Main St", City: "NYC",
			Region: "NY", PostalCode: "10001", Country: "US",
		},
		ExpiresAt: time.Now().Add(15 * time.Minute),
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, nil); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().CreatePayment(ctx, result.Order.ID, "stripe", "pi_svc_1", 1000, "USD"); err != nil {
		t.Fatal(err)
	}

	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	if err := orderSvc.MarkPaid(ctx, result.Order.ID, "pi_svc_1"); err != nil {
		t.Fatal(err)
	}

	order, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != domain.OrderPaid {
		t.Fatalf("expected paid, got %s", order.Status)
	}
}

func TestExpireReservationsViaOrderService(t *testing.T) {
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

	slug := "test-service-expire-" + uuid.NewString()[:8]
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, slug+"@test.local", "hash", "Expire", slug)
	if err != nil {
		t.Fatal(err)
	}
	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID: seller.ID, Slug: "expire-drop", Title: "Expire Drop",
		PriceCents: 1000, InventoryTotal: 2,
		Sizes: []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt: time.Now().Add(-time.Hour), EndsAt: time.Now().Add(24 * time.Hour),
		PublishStatus: domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Products().ReplaceForDrop(ctx, drop.ID, seller.ID, []store.ProductInput{{
		Slug: "default", Name: "Expire Drop", PriceCents: 1000, InventoryTotal: 2,
		Sizes: []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}}); err != nil {
		t.Fatal(err)
	}
	products, err := s.Products().ListByDropID(ctx, drop.ID)
	if err != nil || len(products) == 0 {
		t.Fatal("expected product")
	}

	result, err := s.Orders().ReserveInventory(ctx, store.CheckoutInput{
		SellerID: seller.ID, DropID: drop.ID, ProductID: products[0].ID, ProductName: "Expire Drop",
		BuyerEmail: "buyer@test.local", SizeLabel: "M", SubtotalCents: 1000, Currency: "USD",
		IdempotencyKey: "svc-expire-" + uuid.NewString(),
		ShippingAddress: domain.ShippingAddress{
			Name: "Test Buyer", Line1: "123 Main St", City: "NYC",
			Region: "NY", PostalCode: "10001", Country: "US",
		},
		ExpiresAt: time.Now().Add(-time.Minute),
	})
	if err != nil {
		t.Fatal(err)
	}

	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	n, err := orderSvc.ExpireReservations(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if n < 1 {
		t.Fatalf("expected at least 1 expired, got %d", n)
	}

	order, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != domain.OrderCancelled {
		t.Fatalf("expected cancelled, got %s", order.Status)
	}
}
