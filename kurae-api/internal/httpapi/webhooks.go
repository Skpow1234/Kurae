package httpapi

import (
	"io"
	"net/http"

	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type WebhookHandler struct {
	orders   *store.OrderRepository
	provider payments.Provider
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
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	eventID, orderID, paid, err := h.provider.VerifyWebhook(payload, sig)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid signature")
		return
	}
	if eventID == "" {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	inserted, err := h.orders.SaveWebhookEvent(r.Context(), "stripe", eventID, payload)
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

	_ = h.orders.MarkWebhookProcessed(r.Context(), "stripe", eventID)
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
