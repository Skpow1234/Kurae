package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
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
		DropID string `json:"dropId"`
		Code   string `json:"code"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(body.DropID) == "" || strings.TrimSpace(body.Code) == "" {
		writeError(w, http.StatusBadRequest, "dropId and code are required")
		return
	}

	if err := h.referrals.RecordClick(r.Context(), body.DropID, body.Code); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "Drop not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "Could not record click")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
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
