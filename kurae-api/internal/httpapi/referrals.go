package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type ReferralHandler struct {
	referrals *service.ReferralService
}

func NewReferralHandler(referrals *service.ReferralService) *ReferralHandler {
	return &ReferralHandler{referrals: referrals}
}

func (h *ReferralHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	codes, err := h.referrals.List(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list referral codes")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"referralCodes": codes})
}

func (h *ReferralHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body referralCodeBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	code, err := h.referrals.Create(r.Context(), body.toRequest(claims.SellerID))
	if errors.Is(err, store.ErrConflict) {
		writeError(w, http.StatusConflict, "Code already exists")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"referralCode": code})
}

func (h *ReferralHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	err := h.referrals.Delete(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, store.ErrReferralInUse) {
		writeError(w, http.StatusConflict, "Code has activity and cannot be deleted")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not delete code")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *ReferralHandler) RecordClick(w http.ResponseWriter, r *http.Request) {
	var body struct {
		DropID     string `json:"dropId"`
		SellerSlug string `json:"sellerSlug"`
		Code       string `json:"code"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(body.Code) == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	dropID := strings.TrimSpace(body.DropID)
	sellerSlug := strings.TrimSpace(body.SellerSlug)

	switch {
	case dropID != "":
		if err := h.referrals.RecordClick(r.Context(), dropID, body.Code); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "Drop not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "Could not record click")
			return
		}
	case sellerSlug != "":
		if err := h.referrals.RecordSellerClick(r.Context(), sellerSlug, body.Code); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				writeError(w, http.StatusNotFound, "Seller not found")
				return
			}
			writeError(w, http.StatusInternalServerError, "Could not record click")
			return
		}
	default:
		writeError(w, http.StatusBadRequest, "dropId or sellerSlug is required")
		return
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *ReferralHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	dropID := strings.TrimSpace(r.URL.Query().Get("dropId"))
	code := strings.TrimSpace(r.URL.Query().Get("code"))
	if dropID == "" || code == "" {
		writeError(w, http.StatusBadRequest, "dropId and code are required")
		return
	}

	stats, err := h.referrals.GetStats(r.Context(), dropID, code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load referral stats")
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *ReferralHandler) GetPreview(w http.ResponseWriter, r *http.Request) {
	sellerSlug := strings.TrimSpace(r.URL.Query().Get("sellerSlug"))
	dropSlug := strings.TrimSpace(r.URL.Query().Get("dropSlug"))
	dropID := strings.TrimSpace(r.URL.Query().Get("dropId"))
	code := strings.TrimSpace(r.URL.Query().Get("code"))

	if code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	var preview domain.ReferralPreview
	var err error
	switch {
	case sellerSlug != "":
		preview, err = h.referrals.GetPreview(r.Context(), sellerSlug, dropSlug, code)
	case dropID != "":
		preview, err = h.referrals.GetPreviewByDropID(r.Context(), dropID, code)
	default:
		writeError(w, http.StatusBadRequest, "sellerSlug or dropId is required")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load referral preview")
		return
	}
	writeJSON(w, http.StatusOK, preview)
}

func (h *ReferralHandler) GetRewardSettings(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	settings, err := h.referrals.GetRewardSettings(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load referral reward settings")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *ReferralHandler) UpdateRewardSettings(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Enabled   bool   `json:"enabled"`
		Threshold int    `json:"threshold"`
		Type      string `json:"type"`
		Value     int    `json:"value"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	settings, err := h.referrals.UpdateRewardSettings(r.Context(), service.UpdateReferralRewardSettingsRequest{
		SellerID:  claims.SellerID,
		Enabled:   body.Enabled,
		Threshold: body.Threshold,
		Type:      domain.DiscountType(body.Type),
		Value:     body.Value,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"settings": settings})
}

func (h *ReferralHandler) BuyerListProgress(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok || !claims.IsBuyer() {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	sellerSlug := strings.TrimSpace(r.URL.Query().Get("sellerSlug"))
	if sellerSlug != "" {
		progress, err := h.referrals.GetBuyerProgressForSeller(r.Context(), claims.BuyerID, sellerSlug)
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Seller not found")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Could not load referral progress")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"progress": progress})
		return
	}

	items, err := h.referrals.ListBuyerProgress(r.Context(), claims.BuyerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load referral progress")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type referralCodeBody struct {
	Code   string  `json:"code"`
	DropID *string `json:"dropId"`
}

func (b referralCodeBody) toRequest(sellerID string) service.CreateReferralRequest {
	return service.CreateReferralRequest{
		SellerID: sellerID,
		Code:     b.Code,
		DropID:   b.DropID,
	}
}
