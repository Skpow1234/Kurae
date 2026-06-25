package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
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
		Action string `json:"action"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	order, err := h.orders.UpdateForSeller(r.Context(), claims.SellerID, id, strings.TrimSpace(body.Action))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, service.ErrInvalidOrderAction) {
		writeError(w, http.StatusBadRequest, "Invalid action; use fulfill or refund")
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
		DropID         string `json:"dropId"`
		BuyerEmail     string `json:"buyerEmail"`
		SizeLabel      string `json:"sizeLabel"`
		IdempotencyKey string `json:"idempotencyKey"`
		DiscountCode   string `json:"discountCode"`
		ReferralCode   string `json:"referralCode"`
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
		DropID:         body.DropID,
		BuyerEmail:     buyerEmail,
		SizeLabel:      body.SizeLabel,
		IdempotencyKey: idem,
		DiscountCode:   body.DiscountCode,
		ReferralCode:   body.ReferralCode,
	})
	if errors.Is(err, store.ErrSoldOut) {
		writeError(w, http.StatusConflict, "Sold out")
		return
	}
	if errors.Is(err, store.ErrInvalidDiscount) {
		writeError(w, http.StatusBadRequest, "Invalid or expired discount code")
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
