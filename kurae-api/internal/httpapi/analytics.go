package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type AnalyticsHandler struct {
	analytics *service.AnalyticsService
}

func NewAnalyticsHandler(analytics *service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analytics: analytics}
}

func (h *AnalyticsHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	data, err := h.analytics.GetForSeller(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load analytics")
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *AnalyticsHandler) RecordView(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DropID string `json:"dropId"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(body.DropID) == "" {
		writeError(w, http.StatusBadRequest, "dropId is required")
		return
	}

	if err := h.analytics.RecordView(r.Context(), body.DropID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Drop not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Could not record view")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
