package httpapi

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type OrderHandler struct {
	orders *service.OrderService
}

func NewOrderHandler(orders *service.OrderService) *OrderHandler {
	return &OrderHandler{orders: orders}
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

	orders, total, err := h.orders.ListForSeller(r.Context(), claims.SellerID, status, page, pageSize)
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

func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DropID         string `json:"dropId"`
		BuyerEmail     string `json:"buyerEmail"`
		SizeLabel      string `json:"sizeLabel"`
		IdempotencyKey string `json:"idempotencyKey"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	idem := body.IdempotencyKey
	if idem == "" {
		idem = r.Header.Get("Idempotency-Key")
	}

	result, err := h.orders.Checkout(r.Context(), service.CheckoutRequest{
		DropID:         body.DropID,
		BuyerEmail:     body.BuyerEmail,
		SizeLabel:      body.SizeLabel,
		IdempotencyKey: idem,
	})
	if errors.Is(err, store.ErrSoldOut) {
		writeError(w, http.StatusConflict, "Sold out")
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

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
