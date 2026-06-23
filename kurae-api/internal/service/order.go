package service

import (
	"context"
	"errors"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/store"
)

type OrderService struct {
	orders   *store.OrderRepository
	drops    *store.DropRepository
	provider payments.Provider
	ttl      time.Duration
}

func NewOrderService(s *store.Store, provider payments.Provider, ttl time.Duration) *OrderService {
	return &OrderService{
		orders:   s.Orders(),
		drops:    s.Drops(),
		provider: provider,
		ttl:      ttl,
	}
}

type CheckoutRequest struct {
	DropID         string
	BuyerEmail     string
	SizeLabel      string
	IdempotencyKey string
}

type CheckoutResponse struct {
	OrderID          string            `json:"orderId"`
	ClientSecret     string            `json:"clientSecret"`
	AmountCents      int               `json:"amountCents"`
	Currency         string            `json:"currency"`
	ReservationUntil string            `json:"reservationUntil"`
	Status           domain.OrderStatus `json:"status"`
}

func (o *OrderService) Checkout(ctx context.Context, req CheckoutRequest) (CheckoutResponse, error) {
	if req.IdempotencyKey != "" {
		existing, err := o.orders.GetByIdempotencyKey(ctx, req.IdempotencyKey)
		if err == nil {
			return CheckoutResponse{
				OrderID:     existing.ID,
				AmountCents: existing.AmountCents,
				Currency:    existing.Currency,
				Status:      existing.Status,
			}, nil
		}
		if !errors.Is(err, store.ErrNotFound) {
			return CheckoutResponse{}, err
		}
	}

	drop, err := o.drops.GetByID(ctx, req.DropID)
	if errors.Is(err, store.ErrNotFound) {
		return CheckoutResponse{}, err
	}
	if err != nil {
		return CheckoutResponse{}, err
	}

	expiresAt := time.Now().Add(o.ttl)
	result, err := o.orders.ReserveInventory(ctx, store.CheckoutInput{
		SellerID:       drop.SellerID,
		DropID:         req.DropID,
		BuyerEmail:     req.BuyerEmail,
		SizeLabel:      req.SizeLabel,
		AmountCents:    drop.PriceCents,
		Currency:       drop.Currency,
		IdempotencyKey: req.IdempotencyKey,
		ExpiresAt:      expiresAt,
	})
	if errors.Is(err, store.ErrSoldOut) {
		return CheckoutResponse{}, err
	}
	if err != nil {
		return CheckoutResponse{}, err
	}

	intent, err := o.provider.CreatePaymentIntent(ctx, payments.IntentInput{
		OrderID:     result.Order.ID,
		AmountCents: drop.PriceCents,
		Currency:    drop.Currency,
		Email:       req.BuyerEmail,
	})
	if err != nil {
		return CheckoutResponse{}, err
	}

	if err := o.orders.CreatePayment(ctx, result.Order.ID, intent.ID, drop.PriceCents, drop.Currency); err != nil {
		return CheckoutResponse{}, err
	}

	if err := o.orders.TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, map[string]any{
		"paymentIntentId": intent.ID,
	}); err != nil {
		return CheckoutResponse{}, err
	}

	return CheckoutResponse{
		OrderID:          result.Order.ID,
		ClientSecret:     intent.ClientSecret,
		AmountCents:      drop.PriceCents,
		Currency:         drop.Currency,
		ReservationUntil: expiresAt.UTC().Format(time.RFC3339),
		Status:           domain.OrderPaymentPending,
	}, nil
}

func (o *OrderService) MarkPaid(ctx context.Context, orderID, paymentIntentID string) error {
	if err := o.orders.MarkPaymentPaid(ctx, orderID, paymentIntentID); err != nil {
		return err
	}
	return o.orders.ConvertReservation(ctx, orderID)
}

func (o *OrderService) ListForSeller(ctx context.Context, sellerID, status string, page, pageSize int) ([]domain.SellerOrder, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	records, total, err := o.orders.ListForSeller(ctx, store.ListOrdersFilter{
		SellerID: sellerID,
		Status:   status,
		Limit:    pageSize,
		Offset:   offset,
	})
	if err != nil {
		return nil, 0, err
	}

	out := make([]domain.SellerOrder, len(records))
	for i, r := range records {
		events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
		out[i] = domain.SellerOrder{
			ID:          r.ID,
			SellerSlug:  r.SellerSlug,
			DropID:      r.DropID,
			DropTitle:   r.DropTitle,
			DropSlug:    r.DropSlug,
			BuyerEmail:  r.BuyerEmail,
			SizeLabel:   r.SizeLabel,
			Status:      r.Status,
			AmountCents: r.AmountCents,
			Currency:    r.Currency,
			CreatedAt:   r.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:   r.UpdatedAt.UTC().Format(time.RFC3339),
			Events:      events,
		}
	}
	return out, total, nil
}

func (o *OrderService) GetForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	r, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
	return domain.SellerOrder{
		ID:          r.ID,
		SellerSlug:  r.SellerSlug,
		DropID:      r.DropID,
		DropTitle:   r.DropTitle,
		DropSlug:    r.DropSlug,
		BuyerEmail:  r.BuyerEmail,
		SizeLabel:   r.SizeLabel,
		Status:      r.Status,
		AmountCents: r.AmountCents,
		Currency:    r.Currency,
		CreatedAt:   r.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:   r.UpdatedAt.UTC().Format(time.RFC3339),
		Events:      events,
	}, nil
}

func (o *OrderService) ExpireReservations(ctx context.Context) (int, error) {
	return o.orders.ExpireStaleReservations(ctx, time.Now())
}
