package httpapi

import (
	"io"
	"net/http"
	"strconv"

	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type WebhookHandler struct {
	orders    *store.OrderRepository
	provider  payments.Provider
	ordersSvc *service.OrderService
}

func NewWebhookHandler(s *store.Store, provider payments.Provider, ordersSvc *service.OrderService) *WebhookHandler {
	return &WebhookHandler{
		orders:    s.Orders(),
		provider:  provider,
		ordersSvc: ordersSvc,
	}
}

func (h *WebhookHandler) Stripe(w http.ResponseWriter, r *http.Request) {
	h.handle(payments.ProviderStripe, w, r, r.Header.Get("Stripe-Signature"))
}

func (h *WebhookHandler) MercadoPago(w http.ResponseWriter, r *http.Request) {
	h.handle(payments.ProviderMercadoPago, w, r, r.Header.Get("X-Signature"))
}

func (h *WebhookHandler) Wompi(w http.ResponseWriter, r *http.Request) {
	h.handle(payments.ProviderWompi, w, r, r.Header.Get("X-Event-Checksum"))
}

func (h *WebhookHandler) PayU(w http.ResponseWriter, r *http.Request) {
	h.handle(payments.ProviderPayU, w, r, r.Header.Get("Sign"))
}

func (h *WebhookHandler) ListForSeller(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	pageSize, _ := strconv.Atoi(r.URL.Query().Get("pageSize"))

	events, total, err := h.ordersSvc.ListWebhookEventsForSeller(r.Context(), claims.SellerID, page, pageSize)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list webhook events")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"events": events,
		"total":  total,
		"page":   max(page, 1),
	})
}

func (h *WebhookHandler) handle(provider string, w http.ResponseWriter, r *http.Request, signature string) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	eventID, orderID, paid, err := h.provider.VerifyWebhook(provider, payload, signature)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid signature")
		return
	}
	if eventID == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	inserted, err := h.orders.SaveWebhookEvent(r.Context(), provider, eventID, payload, orderID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not persist event")
		return
	}
	if !inserted {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	if paid && orderID != "" {
		if err := h.ordersSvc.MarkPaid(r.Context(), orderID, ""); err != nil {
			writeError(w, http.StatusInternalServerError, "Could not mark paid")
			return
		}
	}

	_ = h.orders.MarkWebhookProcessed(r.Context(), provider, eventID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
