package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strconv"
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
var ErrInvalidShippingAddress = validate.ErrInvalidShippingAddress
var ErrInvalidTrackingNumber = validate.ErrInvalidTrackingNumber
var ErrOrderExportTooLarge = errors.New("too many orders match filters; narrow the date range or status")

const maxOrderExportRows = 10000

type OrderExportRequest struct {
	SellerID      string
	Status        string
	SortAsc       bool
	CreatedAfter  *time.Time
	CreatedBefore *time.Time
}

type OrderService struct {
	orders             *store.OrderRepository
	drops              *store.DropRepository
	products           *store.ProductRepository
	provider           payments.Provider
	queue              *queue.RedisQueue
	notify             *WaitlistNotifyService
	inventoryAlerts    *InventoryAlertService
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
	inventoryAlerts *InventoryAlertService,
) *OrderService {
	return &OrderService{
		orders:             s.Orders(),
		drops:              s.Drops(),
		products:           s.Products(),
		provider:           provider,
		queue:              q,
		notify:             notify,
		inventoryAlerts:    inventoryAlerts,
		ttl:                ttl,
		devPaymentPollSync: devPaymentPollSync,
	}
}

type CheckoutRequest struct {
	DropID          string
	ProductID       string
	BuyerEmail      string
	SizeLabel       string
	IdempotencyKey  string
	DiscountCode       string
	ReferralCode       string
	CampaignSellerSlug string
	Campaign           domain.CampaignAttribution
	ShippingAddress domain.ShippingAddress
}

type OrderUpdateRequest struct {
	Action         string
	TrackingNumber string
}

type CheckoutResponse struct {
	OrderID          string             `json:"orderId"`
	ClientSecret     string             `json:"clientSecret,omitempty"`
	CheckoutURL      string             `json:"checkoutUrl,omitempty"`
	PaymentProvider  string             `json:"paymentProvider,omitempty"`
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

	product, err := o.resolveCheckoutProduct(ctx, req.DropID, req.ProductID)
	if err != nil {
		return CheckoutResponse{}, err
	}

	if err := validateCheckoutProduct(drop, product, req.SizeLabel, time.Now()); err != nil {
		return CheckoutResponse{}, err
	}

	shipping, err := normalizeCheckoutShipping(req.ShippingAddress)
	if err != nil {
		return CheckoutResponse{}, err
	}

	expiresAt := time.Now().Add(o.ttl)
	campaign := validate.NormalizeCampaign(req.Campaign)
	if campaign.HasTracking() {
		if slug := strings.TrimSpace(req.CampaignSellerSlug); slug == "" ||
			!strings.EqualFold(slug, drop.SellerSlug) {
			campaign = domain.CampaignAttribution{}
		}
	}
	result, err := o.orders.ReserveInventory(ctx, store.CheckoutInput{
		SellerID:        drop.SellerID,
		DropID:          req.DropID,
		ProductID:       product.ID,
		ProductName:     product.Name,
		BuyerEmail:      req.BuyerEmail,
		SizeLabel:       req.SizeLabel,
		SubtotalCents:   product.PriceCents,
		DiscountCode:    req.DiscountCode,
		ReferralCode:    req.ReferralCode,
		Campaign:        campaign,
		Currency:        drop.Currency,
		IdempotencyKey:  req.IdempotencyKey,
		ShippingAddress: shipping,
		ExpiresAt:       expiresAt,
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

	if err := o.orders.CreatePayment(ctx, result.Order.ID, intent.Provider, intent.ID, finalAmount, drop.Currency); err != nil {
		return CheckoutResponse{}, err
	}

	if err := o.orders.TransitionStatus(ctx, result.Order.ID, domain.OrderReserved, domain.OrderPaymentPending, map[string]any{
		"paymentIntentId": intent.ID,
		"paymentProvider": intent.Provider,
	}); err != nil {
		return CheckoutResponse{}, err
	}

	o.checkInventoryAlerts(ctx, req.DropID)

	return o.buildCheckoutResponse(result.Order, intent, finalAmount, drop.Currency, expiresAt), nil
}

func (o *OrderService) buildCheckoutResponse(order store.OrderRecord, intent payments.IntentResult, finalAmount int, currency string, expiresAt time.Time) CheckoutResponse {
	resp := CheckoutResponse{
		OrderID:          order.ID,
		SubtotalCents:    order.SubtotalCents,
		DiscountCents:    order.DiscountCents,
		AmountCents:      finalAmount,
		Currency:         currency,
		ReservationUntil: expiresAt.UTC().Format(time.RFC3339),
		Status:           domain.OrderPaymentPending,
		PaymentProvider:  intent.Provider,
	}
	if intent.CheckoutURL != "" {
		resp.CheckoutURL = intent.CheckoutURL
	} else {
		resp.ClientSecret = intent.ClientSecret
	}
	return resp
}

func (o *OrderService) resolveCheckoutProduct(ctx context.Context, dropID, productID string) (domain.DropProduct, error) {
	if productID != "" {
		product, err := o.products.GetByIDForDrop(ctx, productID, dropID)
		if err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return domain.DropProduct{}, ErrInvalidProduct
			}
			return domain.DropProduct{}, err
		}
		return product, nil
	}

	products, err := o.products.ListByDropID(ctx, dropID)
	if err != nil {
		return domain.DropProduct{}, err
	}
	if len(products) == 1 {
		return products[0], nil
	}
	return domain.DropProduct{}, ErrInvalidProduct
}

func (o *OrderService) checkoutResponseFromExisting(ctx context.Context, order store.OrderRecord) (CheckoutResponse, error) {
	payment, err := o.orders.GetPaymentByOrderID(ctx, order.ID)
	if errors.Is(err, store.ErrNotFound) {
		return CheckoutResponse{}, ErrCheckoutIncomplete
	}
	if err != nil {
		return CheckoutResponse{}, err
	}

	providerName := payment.Provider
	if providerName == "" {
		providerName = payments.ProviderStripe
	}

	checkoutURL := ""
	clientSecret := ""
	if payments.IsRedirectProvider(providerName) {
		checkoutURL, err = o.provider.ClientSecret(ctx, providerName, payment.ProviderPaymentID)
	} else {
		clientSecret, err = o.provider.ClientSecret(ctx, providerName, payment.ProviderPaymentID)
	}
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
		CheckoutURL:      checkoutURL,
		PaymentProvider:  providerName,
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
	shippedAt := formatShippedAt(r.ShippedAt)
	return domain.SellerOrder{
		ID:              r.ID,
		SellerSlug:      r.SellerSlug,
		DropID:          r.DropID,
		DropTitle:       r.DropTitle,
		DropSlug:        r.DropSlug,
		BuyerEmail:      r.BuyerEmail,
		ProductID:       r.ProductID,
		ProductName:     r.ProductName,
		SizeLabel:       r.SizeLabel,
		Status:          r.Status,
		ShippingAddress: r.ShippingAddress,
		TrackingNumber:  r.TrackingNumber,
		ShippedAt:       shippedAt,
		SubtotalCents:   r.SubtotalCents,
		DiscountCents:   r.DiscountCents,
		DiscountCode:    r.DiscountCodeSnapshot,
		AmountCents:     r.AmountCents,
		Currency:        r.Currency,
		CreatedAt:       r.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:       r.UpdatedAt.UTC().Format(time.RFC3339),
		Events:          events,
	}
}

func formatShippedAt(shippedAt *time.Time) string {
	if shippedAt == nil {
		return ""
	}
	return shippedAt.UTC().Format(time.RFC3339)
}

func normalizeCheckoutShipping(in domain.ShippingAddress) (domain.ShippingAddress, error) {
	addr, err := validate.NormalizeShippingAddress(validate.ShippingAddressInput{
		Name:       in.Name,
		Line1:      in.Line1,
		Line2:      in.Line2,
		City:       in.City,
		Region:     in.Region,
		PostalCode: in.PostalCode,
		Country:    in.Country,
	})
	if err != nil {
		return domain.ShippingAddress{}, err
	}
	return domain.ShippingAddress{
		Name:       addr.Name,
		Line1:      addr.Line1,
		Line2:      addr.Line2,
		City:       addr.City,
		Region:     addr.Region,
		PostalCode: addr.PostalCode,
		Country:    addr.Country,
	}, nil
}

func (o *OrderService) GetForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	r, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	events, _ := o.orders.ListAuditEvents(ctx, "order", r.ID)
	return sellerOrderFromRecord(r, events), nil
}

func (o *OrderService) UpdateForSeller(ctx context.Context, sellerID, orderID string, req OrderUpdateRequest) (domain.SellerOrder, error) {
	switch req.Action {
	case "fulfill", "ship":
		return o.shipForSeller(ctx, sellerID, orderID, req.TrackingNumber)
	case "refund":
		return o.refundForSeller(ctx, sellerID, orderID)
	default:
		return domain.SellerOrder{}, ErrInvalidOrderAction
	}
}

func (o *OrderService) shipForSeller(ctx context.Context, sellerID, orderID, trackingNumber string) (domain.SellerOrder, error) {
	record, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if record.Status != domain.OrderPaid {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	tracking, err := validate.NormalizeTrackingNumber(trackingNumber)
	if err != nil {
		return domain.SellerOrder{}, err
	}

	if err := o.orders.MarkOrderShipped(ctx, orderID, domain.OrderPaid, tracking); err != nil {
		return domain.SellerOrder{}, err
	}

	return o.GetForSeller(ctx, sellerID, orderID)
}

func (o *OrderService) refundForSeller(ctx context.Context, sellerID, orderID string) (domain.SellerOrder, error) {
	record, err := o.orders.GetByIDForSeller(ctx, orderID, sellerID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if record.Status != domain.OrderPaid && record.Status != domain.OrderShipped && record.Status != domain.OrderFulfilled {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	payment, err := o.orders.GetPaymentByOrderID(ctx, orderID)
	if err != nil {
		return domain.SellerOrder{}, err
	}
	if payment.Status != "paid" {
		return domain.SellerOrder{}, store.ErrInvalidTransition
	}

	if payment.ProviderPaymentID != "" && !strings.HasPrefix(payment.ProviderPaymentID, "pi_dev_") && !strings.HasPrefix(payment.ProviderPaymentID, "latam_dev_") {
		providerName := payment.Provider
		if providerName == "" {
			providerName = payments.ProviderStripe
		}
		if err := o.provider.RefundPayment(ctx, payments.RefundInput{
			Provider:          providerName,
			ProviderPaymentID: payment.ProviderPaymentID,
			OrderID:           orderID,
			AmountCents:       record.AmountCents,
			Currency:          record.Currency,
		}); err != nil {
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
	for _, dropID := range restocked {
		o.checkInventoryAlerts(ctx, dropID)
	}
	return n, nil
}

func (o *OrderService) checkInventoryAlerts(ctx context.Context, dropID string) {
	if o.inventoryAlerts == nil {
		return
	}
	if err := o.inventoryAlerts.CheckDrop(ctx, dropID); err != nil {
		log.Printf("inventory alert drop=%s: %v", dropID, err)
	}
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
		OrderID:         r.ID,
		Status:          r.Status,
		SellerSlug:      r.SellerSlug,
		DropSlug:        r.DropSlug,
		DropTitle:       r.DropTitle,
		ProductID:       r.ProductID,
		ProductName:     r.ProductName,
		SizeLabel:       r.SizeLabel,
		SubtotalCents:   r.SubtotalCents,
		DiscountCents:   r.DiscountCents,
		DiscountCode:    r.DiscountCodeSnapshot,
		ReferralCode:    r.ReferralCodeSnapshot,
		AmountCents:     r.AmountCents,
		Currency:        r.Currency,
		BuyerEmail:      r.BuyerEmail,
		ShippingAddress: r.ShippingAddress,
		TrackingNumber:  r.TrackingNumber,
		ShippedAt:       formatShippedAt(r.ShippedAt),
		UpdatedAt:       r.UpdatedAt.UTC().Format(time.RFC3339),
		Events:          events,
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

	providerName := payment.Provider
	if providerName == "" {
		providerName = payments.ProviderStripe
	}
	paymentRef := payment.ProviderPaymentID
	if payments.IsRedirectProvider(providerName) {
		paymentRef = orderID
	}

	succeeded, err := o.provider.PaymentSucceeded(ctx, providerName, paymentRef)
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
			ProductName: r.ProductName,
			SizeLabel:   r.SizeLabel,
			AmountCents: r.AmountCents,
			Currency:    r.Currency,
			CreatedAt:   r.CreatedAt.UTC().Format(time.RFC3339),
			UpdatedAt:   r.UpdatedAt.UTC().Format(time.RFC3339),
		})
	}
	return items, total, nil
}

func (o *OrderService) ExportCSV(ctx context.Context, req OrderExportRequest) ([]byte, string, error) {
	records, total, err := o.orders.ListForSeller(ctx, store.ListOrdersFilter{
		SellerID:      req.SellerID,
		Status:        req.Status,
		Limit:         maxOrderExportRows,
		Offset:        0,
		SortAsc:       req.SortAsc,
		CreatedAfter:  req.CreatedAfter,
		CreatedBefore: req.CreatedBefore,
	})
	if err != nil {
		return nil, "", err
	}
	if total > maxOrderExportRows {
		return nil, "", ErrOrderExportTooLarge
	}

	var b strings.Builder
	b.WriteString("order_id,created_at,status,drop_title,drop_slug,product_name,size,buyer_email,subtotal_cents,discount_cents,discount_code,amount_cents,currency,shipping_name,shipping_line1,shipping_line2,shipping_city,shipping_region,shipping_postal_code,shipping_country,tracking_number,shipped_at,referral_code,utm_source,utm_medium,utm_campaign,utm_term,utm_content\n")
	for _, r := range records {
		writeOrderExportRow(&b, r)
	}

	filename := fmt.Sprintf("orders-%s.csv", time.Now().UTC().Format("20060102"))
	return []byte(b.String()), filename, nil
}

func writeOrderExportRow(b *strings.Builder, r store.OrderRecord) {
	b.WriteString(orderCSVCell(r.ID))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.CreatedAt.UTC().Format(time.RFC3339)))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(string(r.Status)))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.DropTitle))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.DropSlug))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.ProductName))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.SizeLabel))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.BuyerEmail))
	b.WriteByte(',')
	b.WriteString(strconv.Itoa(r.SubtotalCents))
	b.WriteByte(',')
	b.WriteString(strconv.Itoa(r.DiscountCents))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(derefString(r.DiscountCodeSnapshot)))
	b.WriteByte(',')
	b.WriteString(strconv.Itoa(r.AmountCents))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.Currency))
	b.WriteByte(',')
	writeShippingCells(b, r.ShippingAddress)
	b.WriteString(orderCSVCell(r.TrackingNumber))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(formatShippedAt(r.ShippedAt)))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(derefString(r.ReferralCodeSnapshot)))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.UTMSource))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.UTMMedium))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.UTMCampaign))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.UTMTerm))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(r.UTMContent))
	b.WriteByte('\n')
}

func writeShippingCells(b *strings.Builder, addr *domain.ShippingAddress) {
	if addr == nil {
		for i := 0; i < 7; i++ {
			if i > 0 {
				b.WriteByte(',')
			}
		}
		return
	}
	b.WriteString(orderCSVCell(addr.Name))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.Line1))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.Line2))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.City))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.Region))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.PostalCode))
	b.WriteByte(',')
	b.WriteString(orderCSVCell(addr.Country))
	b.WriteByte(',')
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func orderCSVCell(value string) string {
	if strings.ContainsAny(value, ",\"\n\r") {
		return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
	}
	return value
}
