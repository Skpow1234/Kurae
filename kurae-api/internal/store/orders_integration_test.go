package store_test

import (
	"context"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

// ExpireStaleReservations sweeps the whole table; serialize tests that call it.
var expireMu sync.Mutex

func TestExpireStaleReservationsRestocksAndCancels(t *testing.T) {
	expireMu.Lock()
	defer expireMu.Unlock()

	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-expire-restock", 2)
	now := time.Now().UTC()

	result, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "expire-1-"+uuid.NewString(), now.Add(-5*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, nil); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().CreatePayment(ctx, result.Order.ID, "stripe", "pi_expire_1", 1000, "USD"); err != nil {
		t.Fatal(err)
	}

	n, _, err := s.Orders().ExpireStaleReservations(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	if n < 1 {
		t.Fatalf("expected at least 1 expired reservation, got %d", n)
	}

	order, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != domain.OrderCancelled {
		t.Fatalf("expected cancelled order, got %s", order.Status)
	}

	res, err := s.Orders().GetReservationByOrderID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != domain.ReservationExpired {
		t.Fatalf("expected expired reservation, got %s", res.Status)
	}

	updated, err := s.Drops().GetByID(ctx, drop.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.InventoryRemaining != 2 {
		t.Fatalf("expected inventory restored to 2, got %d", updated.InventoryRemaining)
	}

	orderEvents, err := s.Orders().ListAuditEvents(ctx, "order", result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	foundExpired := false
	for _, ev := range orderEvents {
		if ev.Label == "reservation_expired" {
			foundExpired = true
			break
		}
	}
	if !foundExpired {
		t.Fatalf("expected reservation_expired audit on order, got %#v", orderEvents)
	}

	reservationEvents, err := s.Orders().ListAuditEvents(ctx, "reservation", result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	foundReservationExpired := false
	for _, ev := range reservationEvents {
		if ev.Label == "expired" {
			foundReservationExpired = true
			break
		}
	}
	if !foundReservationExpired {
		t.Fatalf("expected expired audit on reservation, got %#v", reservationEvents)
	}
}

func TestExpireStaleReservationsIgnoresActiveFuture(t *testing.T) {
	expireMu.Lock()
	defer expireMu.Unlock()

	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-expire-future", 3)
	now := time.Now().UTC()

	_, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "future-1-"+uuid.NewString(), now.Add(15*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}

	n, _, err := s.Orders().ExpireStaleReservations(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("expected 0 expired, got %d", n)
	}

	updated, err := s.Drops().GetByID(ctx, drop.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.InventoryRemaining != 2 {
		t.Fatalf("expected inventory still 2 after reserve, got %d", updated.InventoryRemaining)
	}
}

func TestExpireStaleReservationsRestockedWhenWasSoldOut(t *testing.T) {
	expireMu.Lock()
	defer expireMu.Unlock()

	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-expire-soldout", 1)
	now := time.Now().UTC()

	_, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "soldout-1-"+uuid.NewString(), now.Add(-5*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}

	n, restocked, err := s.Orders().ExpireStaleReservations(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("expected 1 expired, got %d", n)
	}
	found := false
	for _, id := range restocked {
		if id == drop.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected drop %s in restocked list, got %v", drop.ID, restocked)
	}
}

func TestExpireStaleReservationsSkipsConverted(t *testing.T) {
	expireMu.Lock()
	defer expireMu.Unlock()

	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-expire-converted", 2)
	now := time.Now().UTC()

	result, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "converted-1-"+uuid.NewString(), now.Add(-5*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().ConvertReservation(ctx, result.Order.ID); err != nil {
		t.Fatal(err)
	}

	n, _, err := s.Orders().ExpireStaleReservations(ctx, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Fatalf("expected converted reservation not expired, got %d", n)
	}
}

func TestMarkPaymentPaidHappyPath(t *testing.T) {
	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-mark-paid", 2)

	result, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "paid-1-"+uuid.NewString(), time.Now().Add(15*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, nil); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().CreatePayment(ctx, result.Order.ID, "stripe", "pi_paid_1", 1000, "USD"); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().MarkPaymentPaid(ctx, result.Order.ID, "pi_paid_1"); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().ConvertReservation(ctx, result.Order.ID); err != nil {
		t.Fatal(err)
	}

	order, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != domain.OrderPaid {
		t.Fatalf("expected paid, got %s", order.Status)
	}

	payment, err := s.Orders().GetPaymentByOrderID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if payment.Status != "paid" {
		t.Fatalf("expected payment paid, got %s", payment.Status)
	}

	res, err := s.Orders().GetReservationByOrderID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != domain.ReservationConverted {
		t.Fatalf("expected converted reservation, got %s", res.Status)
	}
}

func TestMarkPaymentPaidSecondCallFails(t *testing.T) {
	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-mark-paid-twice", 2)

	result, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "paid-2-"+uuid.NewString(), time.Now().Add(15*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, nil); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().CreatePayment(ctx, result.Order.ID, "stripe", "pi_paid_2", 1000, "USD"); err != nil {
		t.Fatal(err)
	}
	if err := s.Orders().MarkPaymentPaid(ctx, result.Order.ID, "pi_paid_2"); err != nil {
		t.Fatal(err)
	}
	err = s.Orders().MarkPaymentPaid(ctx, result.Order.ID, "pi_paid_2")
	if err != store.ErrNotFound {
		t.Fatalf("expected ErrNotFound on second mark paid, got %v", err)
	}
}

func TestSaveWebhookEventWithOrderID(t *testing.T) {
	s, ctx := openStore(t)
	defer s.Close()

	seller, drop, productID := seedCheckoutFixture(t, s, ctx, "test-webhook-order", 2)
	result, err := s.Orders().ReserveInventory(ctx, checkoutInput(seller.ID, drop.ID, productID, "wh-1-"+uuid.NewString(), time.Now().Add(15*time.Minute)))
	if err != nil {
		t.Fatal(err)
	}

	eventID := "evt_" + uuid.NewString()
	payload := []byte(`{"type":"payment_intent.succeeded"}`)
	inserted, err := s.Orders().SaveWebhookEvent(ctx, "stripe", eventID, payload, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !inserted {
		t.Fatal("expected insert")
	}

	inserted, err = s.Orders().SaveWebhookEvent(ctx, "stripe", eventID, payload, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if inserted {
		t.Fatal("expected duplicate ignored")
	}

	if err := s.Orders().MarkWebhookProcessed(ctx, "stripe", eventID); err != nil {
		t.Fatal(err)
	}

	var processedAt *time.Time
	var orderID *string
	err = s.Pool().QueryRow(ctx, `
		SELECT processed_at, order_id FROM webhook_events WHERE provider = $1 AND event_id = $2
	`, "stripe", eventID).Scan(&processedAt, &orderID)
	if err != nil {
		t.Fatal(err)
	}
	if processedAt == nil {
		t.Fatal("expected processed_at set")
	}
	if orderID == nil || *orderID != result.Order.ID {
		t.Fatalf("expected order_id %s, got %v", result.Order.ID, orderID)
	}
}

func TestSaveWebhookEventInvalidOrderIDStillPersists(t *testing.T) {
	s, ctx := openStore(t)
	defer s.Close()

	eventID := "evt_invalid_" + uuid.NewString()
	payload := []byte(`{"type":"payment_intent.succeeded"}`)
	inserted, err := s.Orders().SaveWebhookEvent(ctx, "stripe", eventID, payload, uuid.NewString())
	if err != nil {
		t.Fatal(err)
	}
	if !inserted {
		t.Fatal("expected insert even with unknown order id")
	}

	var orderID *string
	err = s.Pool().QueryRow(ctx, `
		SELECT order_id from webhook_events WHERE provider = $1 AND event_id = $2
	`, "stripe", eventID).Scan(&orderID)
	if err != nil {
		t.Fatal(err)
	}
	if orderID != nil {
		t.Fatalf("expected null order_id fallback, got %v", orderID)
	}
}

func openStore(t *testing.T) (*store.Store, context.Context) {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL not set")
	}
	ctx := context.Background()
	s, err := store.New(ctx, databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	return s, ctx
}

func seedCheckoutFixture(t *testing.T, s *store.Store, ctx context.Context, slugPrefix string, inventory int) (domain.Seller, domain.DropRecord, string) {
	t.Helper()
	slug := slugPrefix + "-" + uuid.NewString()[:8]
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, slug+"@test.local", "hash", "Test", slug)
	if err != nil {
		t.Fatal(err)
	}

	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID:       seller.ID,
		Slug:           "drop",
		Title:          "Test Drop",
		PriceCents:     1000,
		InventoryTotal: inventory,
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
		Name:           "Test Drop",
		PriceCents:     1000,
		InventoryTotal: inventory,
		Sizes:          []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}}); err != nil {
		t.Fatal(err)
	}
	products, err := s.Products().ListByDropID(ctx, drop.ID)
	if err != nil || len(products) == 0 {
		t.Fatal("expected product")
	}
	return seller, drop, products[0].ID
}

func checkoutInput(sellerID, dropID, productID, key string, expiresAt time.Time) store.CheckoutInput {
	return store.CheckoutInput{
		SellerID:      sellerID,
		DropID:        dropID,
		ProductID:     productID,
		ProductName:   "Test Drop",
		BuyerEmail:    "buyer@test.local",
		SizeLabel:     "M",
		SubtotalCents: 1000,
		Currency:      "USD",
		IdempotencyKey: key,
		ShippingAddress: domain.ShippingAddress{
			Name: "Test Buyer", Line1: "123 Main St", City: "NYC",
			Region: "NY", PostalCode: "10001", Country: "US",
		},
		ExpiresAt: expiresAt,
	}
}
