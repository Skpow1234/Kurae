package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type OrderHandler struct {
	orders *service.OrderService
	auth   *service.AuthService
}

func NewOrderHandler(orders *service.OrderService, auth *service.AuthService) *OrderHandler {
	return &OrderHandler{orders: orders, auth: auth}
}

func (h *OrderHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))
	status := r.URL.Query().Get("status")
	sortAsc := r.URL.Query().Get("sort") == "oldest"
	createdAfter, err := parseOrderTimeFilter(r.URL.Query().Get("from"), false)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid from date")
		return
	}
	createdBefore, err := parseOrderTimeFilter(r.URL.Query().Get("to"), true)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid to date")
		return
	}

	orders, total, err := h.orders.ListForSeller(r.Context(), claims.SellerID, status, page, pageSize, sortAsc, createdAfter, createdBefore)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  total,
		"page":   max(page, 1),
	})
}

func (h *OrderHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	order, err := h.orders.GetForSeller(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load order")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"order": order})
}

func (h *OrderHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var body struct {
		Action         string `json:"action"`
		TrackingNumber string `json:"trackingNumber"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	action := strings.TrimSpace(body.Action)
	switch action {
	case "ship":
		if !claims.Allows(domain.PermOrdersFulfill) {
			writeError(w, http.StatusForbidden, "Insufficient permissions")
			return
		}
	case "refund":
		if !claims.Allows(domain.PermOrdersRefund) {
			writeError(w, http.StatusForbidden, "Insufficient permissions")
			return
		}
	}

	order, err := h.orders.UpdateForSeller(r.Context(), claims.SellerID, id, service.OrderUpdateRequest{
		Action:         strings.TrimSpace(body.Action),
		TrackingNumber: strings.TrimSpace(body.TrackingNumber),
	})
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, service.ErrInvalidOrderAction) {
		writeError(w, http.StatusBadRequest, "Invalid action; use ship or refund")
		return
	}
	if errors.Is(err, service.ErrInvalidTrackingNumber) {
		writeError(w, http.StatusBadRequest, "Tracking number is required")
		return
	}
	if errors.Is(err, store.ErrInvalidTransition) {
		writeError(w, http.StatusConflict, "Order cannot be updated in its current status")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadGateway, "Could not update order")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"order": order})
}

func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DropID          string `json:"dropId"`
		ProductID       string `json:"productId"`
		BuyerEmail      string `json:"buyerEmail"`
		SizeLabel       string `json:"sizeLabel"`
		IdempotencyKey  string `json:"idempotencyKey"`
		DiscountCode    string `json:"discountCode"`
		ReferralCode       string `json:"referralCode"`
		CampaignSellerSlug string `json:"campaignSellerSlug"`
		UTMSource          string `json:"utmSource"`
		UTMMedium          string `json:"utmMedium"`
		UTMCampaign        string `json:"utmCampaign"`
		UTMTerm            string `json:"utmTerm"`
		UTMContent         string `json:"utmContent"`
		ShippingAddress struct {
			Name       string `json:"name"`
			Line1      string `json:"line1"`
			Line2      string `json:"line2"`
			City       string `json:"city"`
			Region     string `json:"region"`
			PostalCode string `json:"postalCode"`
			Country    string `json:"country"`
		} `json:"shippingAddress"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	idem := body.IdempotencyKey
	if idem == "" {
		idem = r.Header.Get("Idempotency-Key")
	}

	buyerEmail := strings.TrimSpace(body.BuyerEmail)
	if token := bearerToken(r); token != "" {
		if claims, err := h.auth.ParseToken(token); err == nil && claims.IsBuyer() {
			buyerEmail = claims.Email
		}
	}
	if buyerEmail == "" {
		writeError(w, http.StatusBadRequest, "buyerEmail is required")
		return
	}

	result, err := h.orders.Checkout(r.Context(), service.CheckoutRequest{
		DropID:             body.DropID,
		ProductID:          body.ProductID,
		BuyerEmail:         buyerEmail,
		SizeLabel:          body.SizeLabel,
		IdempotencyKey:     idem,
		DiscountCode:       body.DiscountCode,
		ReferralCode:       body.ReferralCode,
		CampaignSellerSlug: body.CampaignSellerSlug,
		Campaign: domain.CampaignAttribution{
			Source:   body.UTMSource,
			Medium:   body.UTMMedium,
			Campaign: body.UTMCampaign,
			Term:     body.UTMTerm,
			Content:  body.UTMContent,
		},
		ShippingAddress: domain.ShippingAddress{
			Name:       body.ShippingAddress.Name,
			Line1:      body.ShippingAddress.Line1,
			Line2:      body.ShippingAddress.Line2,
			City:       body.ShippingAddress.City,
			Region:     body.ShippingAddress.Region,
			PostalCode: body.ShippingAddress.PostalCode,
			Country:    body.ShippingAddress.Country,
		},
	})
	if errors.Is(err, service.ErrCheckoutIncomplete) {
		writeError(w, http.StatusConflict, "Checkout is still in progress; retry without the same idempotency key")
		return
	}
	if errors.Is(err, store.ErrSoldOut) {
		writeError(w, http.StatusConflict, "Sold out")
		return
	}
	if errors.Is(err, service.ErrDropNotCheckoutable) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, service.ErrDropNotStarted) {
		writeError(w, http.StatusConflict, "Drop has not started yet")
		return
	}
	if errors.Is(err, service.ErrDropEnded) {
		writeError(w, http.StatusConflict, "Drop has ended")
		return
	}
	if errors.Is(err, service.ErrInvalidSize) {
		writeError(w, http.StatusBadRequest, "Invalid or unavailable size")
		return
	}
	if errors.Is(err, store.ErrInvalidDiscount) {
		writeError(w, http.StatusBadRequest, "Invalid or expired discount code")
		return
	}
	if errors.Is(err, service.ErrInvalidShippingAddress) {
		writeError(w, http.StatusBadRequest, "Complete shipping address is required")
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Checkout failed")
		return
	}

	writeJSON(w, http.StatusCreated, result)
}

func (h *OrderHandler) BuyerStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	email := strings.TrimSpace(r.URL.Query().Get("email"))
	if email == "" {
		writeError(w, http.StatusBadRequest, "email query parameter is required")
		return
	}

	status, err := h.orders.GetBuyerOrderStatus(r.Context(), id, email)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load order status")
		return
	}
	writeJSON(w, http.StatusOK, status)
}

func (h *OrderHandler) BuyerList(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || !claims.IsBuyer() {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))

	orders, total, err := h.orders.ListForBuyer(r.Context(), claims.Email, page, pageSize)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list orders")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"orders": orders,
		"total":  total,
		"page":   max(page, 1),
	})
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func parseOrderTimeFilter(raw string, endExclusive bool) (*time.Time, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return &t, nil
	}
	t, err := time.Parse("2006-01-02", raw)
	if err != nil {
		return nil, err
	}
	if endExclusive {
		t = t.Add(24 * time.Hour)
	}
	return &t, nil
}
