package httpapi

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type PublicHandler struct {
	drops    *service.DropService
	waitlist *service.WaitlistService
	auth     *service.AuthService
}

func NewPublicHandler(drops *service.DropService, waitlist *service.WaitlistService, auth *service.AuthService) *PublicHandler {
	return &PublicHandler{drops: drops, waitlist: waitlist, auth: auth}
}

func (h *PublicHandler) ListDrops(w http.ResponseWriter, r *http.Request) {
	drops, err := h.drops.ListPublicFeed(r.Context(), 24)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load drops")
		return
	}
	if drops == nil {
		drops = []domain.PublicDrop{}
	}
	writeJSON(w, http.StatusOK, map[string]any{"drops": drops})
}

func (h *PublicHandler) GetDrop(w http.ResponseWriter, r *http.Request) {
	sellerSlug := chi.URLParam(r, "seller")
	dropSlug := chi.URLParam(r, "drop")

	allowDraft := false
	if r.URL.Query().Get("preview") == "1" {
		if token := bearerToken(r); token != "" {
			if claims, err := h.auth.ParseToken(token); err == nil && claims.SellerSlug == sellerSlug {
				allowDraft = true
			}
		}
	}

	drop, err := h.drops.GetPublic(r.Context(), sellerSlug, dropSlug, allowDraft)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load drop")
		return
	}

	writeJSON(w, http.StatusOK, drop)
}

func (h *PublicHandler) JoinWaitlist(w http.ResponseWriter, r *http.Request) {
	dropID := chi.URLParam(r, "id")
	var body struct {
		Email string `json:"email"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	count, err := h.waitlist.Join(r.Context(), dropID, body.Email)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "waitlistCount": count})
}
