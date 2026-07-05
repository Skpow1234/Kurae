package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/kurae/kurae-api/internal/domain"
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

	req, err := parseAnalyticsRequest(r, claims.SellerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	data, err := h.analytics.GetForSeller(r.Context(), req)
	if err != nil {
		if errors.Is(err, service.ErrInvalidAnalyticsRange) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err.Error() == "drop not found" {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Could not load analytics")
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *AnalyticsHandler) Export(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	req, err := parseAnalyticsRequest(r, claims.SellerID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	format := strings.TrimSpace(r.URL.Query().Get("format"))
	csv, filename, err := h.analytics.ExportCSV(r.Context(), req, format)
	if err != nil {
		if errors.Is(err, service.ErrInvalidAnalyticsRange) {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Could not export analytics")
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(csv)
}

func parseAnalyticsRequest(r *http.Request, sellerID string) (service.AnalyticsRequest, error) {
	days, err := strconv.Atoi(r.URL.Query().Get("days"))
	if err != nil {
		days = 7
	}

	var dropID *string
	if raw := strings.TrimSpace(r.URL.Query().Get("dropId")); raw != "" {
		dropID = &raw
	}

	return service.AnalyticsRequest{
		SellerID: sellerID,
		Days:     days,
		DropID:   dropID,
	}, nil
}

func (h *AnalyticsHandler) RecordView(w http.ResponseWriter, r *http.Request) {
	var body struct {
		SellerSlug string `json:"sellerSlug"`
		DropID     string `json:"dropId"`
		UTMSource  string `json:"utmSource"`
		UTMMedium  string `json:"utmMedium"`
		UTMCampaign string `json:"utmCampaign"`
		UTMTerm    string `json:"utmTerm"`
		UTMContent string `json:"utmContent"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	dropID := strings.TrimSpace(body.DropID)
	sellerSlug := strings.TrimSpace(body.SellerSlug)
	campaign := domain.CampaignAttribution{
		Source:   body.UTMSource,
		Medium:   body.UTMMedium,
		Campaign: body.UTMCampaign,
		Term:     body.UTMTerm,
		Content:  body.UTMContent,
	}

	if dropID != "" && sellerSlug == "" {
		if err := h.analytics.RecordView(r.Context(), dropID); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "Drop not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "Could not record view")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	if sellerSlug == "" {
		writeError(w, http.StatusBadRequest, "sellerSlug is required")
		return
	}

	if err := h.analytics.RecordTouch(r.Context(), service.RecordTouchRequest{
		SellerSlug: sellerSlug,
		DropID:     dropID,
		Campaign:   campaign,
	}); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Not found")
			return
		}
		if err.Error() == "dropId or campaign params required" {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "Could not record touch")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
