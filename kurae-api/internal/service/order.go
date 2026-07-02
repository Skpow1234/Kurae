package service

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
)

var ErrInvalidOrderAction = errors.New("invalid order action")
var ErrCheckoutIncomplete = errors.New("checkout incomplete")

type OrderService struct {
	orders             *store.OrderRepository
	drops              *store.DropRepository
	provider           payments.Provider
	queue              *queue.RedisQueue
	notify             *WaitlistNotifyService
	ttl                time.Duration
	devPaymentPollSync bool
}

func NewOrderService(
	s *store.Store,
	provider payments.Provider,
	q *queue.RedisQueue,
	ttl time.Duration,
	devPaymentPollSync bool,
	notify *WaitlistNotifyService,
) *OrderService {
	return &OrderService{
		orders:             s.Orders(),
		drops:              s.Drops(),
		provider:           provider,
		queue:              q,
		notify:             notify,
		ttl:                ttl,
		devPaymentPollSync: devPaymentPollSync,
	}
}

type CheckoutRequest struct {
	DropID         string
	BuyerEmail     string
	SizeLabel      string
	IdempotencyKey string
	DiscountCode   string
	ReferralCode   string
}

type CheckoutResponse struct {
	OrderID          string             `json:"orderId"`
	ClientSecret     string             `json:"clientSecret"`
	SubtotalCents    int                `json:"subtotalCents"`
	DiscountCents    int                `json:"discountCents"`
	AmountCents      int                `json:"amountCents"`
	Currency         string             `json:"currency"`
	ReservationUntil string             `json:"reservationUntil"`
	Status           domain.OrderStatus `json:"status"`
}

func (o *OrderService) Checkout(ctx context.Context, req CheckoutRequest) (CheckoutResponse, error) {
	buyerEmail, err := validate.NormalizeEmail(req.BuyerEmail)
	if err != nil {
		return CheckoutResponse{}, err
	}
	req.BuyerEmail = buyerEmail

	if req.IdempotencyKey != "" {
		existing, err := o.orders.GetByIdempotencyKey(ctx, req.IdempotencyKey)
		if err == nil {
			return o.checkoutResponseFromExisting(ctx, existing)
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

	if err := validateCheckoutDrop(drop, req.SizeLabel, time.Now()); err != nil {
		return CheckoutResponse{}, err
	}

	expiresAt := time.Now().Add(o.ttl)
	result, err := o.orders.ReserveInventory(ctx, store.CheckoutInput{
		SellerID:       drop.SellerID,
		DropID:         req.DropID,
		BuyerEmail:     req.BuyerEmail,
		SizeLabel:      req.SizeLabel,
		SubtotalCents:  drop.PriceCents,
		DiscountCode:   req.DiscountCode,
		ReferralCode:   req.ReferralCode,
		Currency:       drop.Currency,
		IdempotencyKey: req.IdempotencyKey,
		ExpiresAt:      expiresAt,
	})
	if errors.Is(err, store.ErrSoldOut) {
		return CheckoutResponse{}, err
	}
	if errors.Is(err, store.ErrInvalidDiscount) {
		return CheckoutResponse{}, err
	}
	if err != nil {
		return CheckoutResponse{}, err
	}

	finalAmount := result.Order.AmountCents

	intent, err := o.provider.CreatePaymentIntent(ctx, payments.IntentInput{
		OrderID:     result.Order.ID,
		AmountCents: finalAmount,
		Currency:    drop.Currency,
		Email:       req.BuyerEmail,
	})
	if err != nil {
		return CheckoutResponse{}, err
	}

	if err := o.orders.CreatePayment(ctx, result.Order.ID, intent.ID, finalAmount, drop.Currency); err != nil {
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
		SubtotalCents:    result.Order.SubtotalCents,
		DiscountCents:    result.Order.DiscountCents,
		AmountCents:      finalAmount,
		Currency:         drop.Currency,
		ReservationUntil: expiresAt.UTC().Format(time.RFC3339),
		Status:           domain.OrderPaymentPending,
	}, nil
}

func (o *OrderService) checkoutResponseFromExisting(ctx context.Context, order store.OrderRecord) (CheckoutResponse, error) {
	payment, err := o.orders.GetPaymentByOrderID(ctx, order.ID)
	if errors.Is(err, store.ErrNotFound) {
		return CheckoutResponse{}, ErrCheckoutIncomplete
	}
	if err != nil {
		return CheckoutResponse{}, err
	}

	clientSecret, err := o.provider.ClientSecret(ctx, payment.ProviderPaymentID)
	if err != nil {
		return CheckoutResponse{}, err
	}

	reservationUntil := ""
	if res, err := o.orders.GetReservationByOrderID(ctx, order.ID); err == nil {
		reservationUntil = res.ExpiresAt.UTC().Format(time.RFC3339)
	}

	return CheckoutResponse{
		OrderID:          order.ID,
		ClientSecret:     clientSecret,
		SubtotalCents:    order.SubtotalCents,
		DiscountCents:    order.DiscountCents,
		AmountCents:      order.AmountCents,
		Currency:         order.Currency,
		ReservationUntil: reservationUntil,
		Status:           order.Status,
	}, nil
}

func (o *OrderService) MarkPaid(ctx context.Context, orderID, paymentIntentID string) error {
	if err := o.orders.MarkPaymentPaid(ctx, orderID, paymentIntentID); err != nil {
		return err
	}
	if err := o.orders.ConvertReservation(ctx, orderID); err != nil {
		return err
	}

	if o.queue != nil {
		order, err := o.orders.GetByID(ctx, orderID)
		if err == nil {
			if err := o.queue.EnqueueEmail(ctx, queue.EmailJob{
				Type:       queue.EmailTypeOrderConfirmation,
				OrderID:    order.ID,
				BuyerEmail: order.BuyerEmail,
				DropTitle:  order.DropTitle,
			}); err != nil {
				log.Printf("enqueue order confirmation email order=%s: %v", order.ID, err)
			}
		}
	}
	return nil
}

func (o *OrderService) ListForSeller(ctx context.Context, sellerID, status string, page, pageSize int, sortAsc bool, createdAfter, createdBefore *time.Time) ([]domain.SellerOrder, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	records, total, err := o.orders.ListForSeller(ctx, store.ListOrdersFilter{
		SellerID:      sellerID,
		Status:        status,
		Limit:         pageSize,
		Offset:        offset,
		SortAsc:       sortAsc,
		CreatedAfter:  createdAfter,
		CreatedBefore: createdBefore,
	})
	if err != nil {
		return nil, 0, err
	}

	out := make([]domain.SellerOrder, len(records))
	for i, r := range records {
		events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
		out[i] = sellerOrderFromRecord(r, events)
	}
	return out, total, nil
}

func sellerOrderFromRecord(r store.OrderRecord, events []domain.OrderEvent) domain.SellerOrder {
	return domain.SellerOrder{
		ID:            r.ID,
		SellerSlug:    r.SellerSlug,
		DropID:        r.DropID,
		DropTitle:     r.DropTitle,
		DropSlug:      r.DropSlug,
		BuyerEmail:    r.BuyerEmail,
		SizeLabel:     r.SizeLabel,
		Status:        r.Status,
		SubtotalCents: r.SubtotalCents,
		DiscountCents: r.DiscountCents,
		DiscountCode:  r.DiscountCodeSnapshot,
		AmountCents:   r.AmountCents,
		Currency:      r.Currency,
		CreatedAt:     r.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:     r.UpdatedAt.UTC().Format(time.RFC3339),
		Events:        events,
	}
}

func (o *OrderService) GetForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	r, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
	return sellerOrderFromRecord(r, events), nil
}

func (o *OrderService) UpdateForSeller(ctx context.Context, sellerID, orderID, action string) (domain.SellerOrder, error) {
	switch action {
	case "fulfill":
		return o.fulfillForSeller(ctx, sellerID, orderID)
	case "refund":
		return o.refundForSeller(ctx, sellerID, orderID)
	default:
		return domain.SellerOrder{}, ErrInvalidOrderAction
	}
}

func (o *OrderService) fulfillForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	record, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if record.Status != domain.OrderPaid {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	if err := o.orders.TransitionStatus(ctx, orderID, domain.OrderPaid, domain.OrderFulfilled, map[string]any{
		"by": "seller",
	}); err != nil {
		return domain.SellerOrder{}, err
	}

	return o.GetForSeller(ctx, sellerID, orderID)
}

func (o *OrderService) refundForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	record, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if record.Status != domain.OrderPaid && record.Status != domain.OrderFulfilled {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	payment, err := o.orders.GetPaymentByOrderID(ctx, orderID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if payment.Status != "paid" {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	if payment.ProviderPaymentID != "" && !strings.HasPrefix(payment.ProviderPaymentID, "pi_dev_") {
		if err := o.provider.RefundPayment(ctx, payment.ProviderPaymentID); err != nil {
			return domain.SellerOrder{}, err
		}
	}

	if err := o.orders.MarkOrderRefunded(ctx, orderID, record.Status); err != nil {
		return domain.SellerOrder{}, err
	}

	return o.GetForSeller(ctx, sellerID, orderID)
}

func (o *OrderService) ExpireReservations(ctx context.Context) (int, error) {
	n, restocked, err := o.orders.ExpireStaleReservations(ctx, time.Now())
	if err != nil {
		return 0, err
	}
	if o.notify != nil {
		for _, dropID := range restocked {
			if err := o.notify.NotifyRestock(ctx, dropID); err != nil {
				log.Printf("enqueue waitlist restock drop=%s: %v", dropID, err)
			}
		}
	}
	return n, nil
}

func (o *OrderService) GetBuyerOrderStatus(ctx context.Context, orderID, email string) (domain.BuyerOrderStatus, error) {
	if o.devPaymentPollSync {
		_ = o.syncPaymentFromProvider(ctx, orderID)
	}

	r, err := o.orders.GetByID(ctx, orderID)
	if err != nil {
		return domain.BuyerOrderStatus{}, err
	}
	if !strings.EqualFold(strings.TrimSpace(r.BuyerEmail), strings.TrimSpace(email)) {
		return domain.BuyerOrderStatus{}, store.ErrNotFound
	}
	events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
	return domain.BuyerOrderStatus{
		OrderID:       r.ID,
		Status:        r.Status,
		SellerSlug:    r.SellerSlug,
		DropSlug:      r.DropSlug,
		DropTitle:     r.DropTitle,
		SizeLabel:     r.SizeLabel,
		SubtotalCents: r.SubtotalCents,
		DiscountCents: r.DiscountCents,
		DiscountCode:  r.DiscountCodeSnapshot,
		ReferralCode:  r.ReferralCodeSnapshot,
		AmountCents:   r.AmountCents,
		Currency:      r.Currency,
		BuyerEmail:    r.BuyerEmail,
		UpdatedAt:     r.UpdatedAt.UTC().Format(time.RFC3339),
		Events:        events,
	}, nil
}

func (o *OrderService) syncPaymentFromProvider(ctx context.Context, orderID string) error {
	r, err := o.orders.GetByID(ctx, orderID)
	if err != nil {
		return err
	}
	if r.Status != domain.OrderPaymentPending {
		return nil
	}

	payment, err := o.orders.GetPaymentByOrderID(ctx, orderID)
	if err != nil {
		return nil
	}

	succeeded, err := o.provider.PaymentSucceeded(ctx, payment.ProviderPaymentID)
	if err != nil || !succeeded {
		return err
	}

	return o.MarkPaid(ctx, orderID, payment.ProviderPaymentID)
}

func (o *OrderService) ListForBuyer(ctx context.Context, email string, page, pageSize int) ([]domain.BuyerOrderListItem, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	records, total, err := o.orders.ListForBuyerEmail(ctx, email, pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	items := make([]domain.BuyerOrderListItem, 0, len(records))
	for _, r := range records {
		items = append(items, domain.BuyerOrderListItem{
			OrderID:     r.ID,
			Status:      r.Status,
			SellerSlug:  r.SellerSlug,
			DropSlug:    r.DropSlug,
			DropTitle:   r.DropTitle,
			SizeLabel:   r.SizeLabel,
			AmountCents: r.AmountCents,
			Currency:    r.Currency,
			CreatedAt:   r.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:   r.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	return items, total, nil
}
