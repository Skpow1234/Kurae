package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type fakePaymentProvider struct {
	eventID string
	orderID string
	paid    bool
	err     error
}

func (f *fakePaymentProvider) CreatePaymentIntent(ctx context.Context, in payments.IntentInput) (payments.IntentResult, error) {
	return payments.IntentResult{}, errors.New("not implemented")
}

func (f *fakePaymentProvider) ClientSecret(ctx context.Context, providerName, providerPaymentID string) (string, error) {
	return "", errors.New("not implemented")
}

func (f *fakePaymentProvider) RefundPayment(ctx context.Context, in payments.RefundInput) error {
	return errors.New("not implemented")
}

func (f *fakePaymentProvider) VerifyWebhook(providerName string, payload []byte, signature string) (string, string, bool, error) {
	if f.err != nil {
		return "", "", false, f.err
	}
	return f.eventID, f.orderID, f.paid, nil
}

func (f *fakePaymentProvider) PaymentSucceeded(ctx context.Context, providerName, providerPaymentID string) (bool, error) {
	return false, nil
}

func TestWebhookHandlerBadSignature(t *testing.T) {
	s, ctx := openWebhookStore(t)
	defer s.Close()

	provider := &fakePaymentProvider{err: errors.New("bad signature")}
	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	h := NewWebhookHandler(s, provider, orderSvc)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	h.Stripe(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rec.Code)
	}
	_ = ctx
}

func TestWebhookHandlerMarksPaidOnce(t *testing.T) {
	s, ctx := openWebhookStore(t)
	defer s.Close()

	slug := "test-webhook-handler-" + uuid.NewString()[:8]
	_, _ = s.Pool().Exec(ctx, `DELETE FROM sellers WHERE slug = $1`, slug)

	seller, err := s.Sellers().Create(ctx, slug+"@test.local", "hash", "Webhook", slug)
	if err != nil {
		t.Fatal(err)
	}
	drop, err := s.Drops().Create(ctx, store.CreateDropInput{
		SellerID: seller.ID, Slug: "wh-drop", Title: "WH Drop",
		PriceCents: 1000, InventoryTotal: 2,
		Sizes: []domain.DropSize{{ID: "m", Label: "M", Available: true}},
		StartsAt: time.Now().Add(-time.Hour), EndsAt: time.Now().Add(24 * time.Hour),
		PublishStatus: domain.PublishPublished,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Products().ReplaceForDrop(ctx, drop.ID, seller.ID, []store.ProductInput{{
		Slug: "default", Name: "WH Drop", PriceCents: 1000, InventoryTotal: 2,
		Sizes: []domain.DropSize{{ID: "m", Label: "M", Available: true}},
	}}); err != nil {
		t.Fatal(err)
	}
	products, err := s.Products().ListByDropID(ctx, drop.ID)
	if err != nil || len(products) == 0 {
		t.Fatal("expected product")
	}

	result, err := s.Orders().ReserveInventory(ctx, store.CheckoutInput{
		SellerID: seller.ID, DropID: drop.ID, ProductID: products[0].ID, ProductName: "WH Drop",
		BuyerEmail: "buyer@test.local", SizeLabel: "M", SubtotalCents: 1000, Currency: "USD",
		IdempotencyKey: "wh-handler-" + uuid.NewString(),
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
	if err := s.Orders().CreatePayment(ctx, result.Order.ID, "stripe", "pi_wh_1", 1000, "USD"); err != nil {
		t.Fatal(err)
	}

	eventID := "evt_handler_" + uuid.NewString()
	provider := &fakePaymentProvider{
		eventID: eventID,
		orderID: result.Order.ID,
		paid:    true,
	}
	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	h := NewWebhookHandler(s, provider, orderSvc)

	body := []byte(`{"ok":true}`)
	req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader(body))
	rec := httptest.NewRecorder()
	h.Stripe(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}

	order, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order.Status != domain.OrderPaid {
		t.Fatalf("expected paid after webhook, got %s", order.Status)
	}

	// Duplicate event should be ignored and leave order paid.
	req2 := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader(body))
	rec2 := httptest.NewRecorder()
	h.Stripe(rec2, req2)
	if rec2.Code != http.StatusOK {
		t.Fatalf("expected 200 on duplicate, got %d", rec2.Code)
	}

	order2, err := s.Orders().GetByID(ctx, result.Order.ID)
	if err != nil {
		t.Fatal(err)
	}
	if order2.Status != domain.OrderPaid {
		t.Fatalf("expected still paid, got %s", order2.Status)
	}
}

func TestWebhookHandlerIgnoresUnpaidEvent(t *testing.T) {
	s, ctx := openWebhookStore(t)
	defer s.Close()

	provider := &fakePaymentProvider{
		eventID: "evt_unpaid_" + uuid.NewString(),
		orderID: "",
		paid:    false,
	}
	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	h := NewWebhookHandler(s, provider, orderSvc)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	h.Stripe(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var body map[string]bool
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if !body["ok"] {
		t.Fatal("expected ok response")
	}
	_ = ctx
}

func TestWebhookHandlerEmptyEventID(t *testing.T) {
	s, _ := openWebhookStore(t)
	defer s.Close()

	provider := &fakePaymentProvider{eventID: "", paid: true}
	orderSvc := service.NewOrderService(s, payments.NewNoopProvider(), nil, 15*time.Minute, false, nil, nil)
	h := NewWebhookHandler(s, provider, orderSvc)

	req := httptest.NewRequest(http.MethodPost, "/webhooks/stripe", bytes.NewReader([]byte(`{}`)))
	rec := httptest.NewRecorder()
	h.Stripe(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func openWebhookStore(t *testing.T) (*store.Store, context.Context) {
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
