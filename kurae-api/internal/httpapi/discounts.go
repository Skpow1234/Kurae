package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type DiscountHandler struct {
	discounts *service.DiscountService
	orders    *service.OrderService
}

func NewDiscountHandler(discounts *service.DiscountService, orders *service.OrderService) *DiscountHandler {
	return &DiscountHandler{discounts: discounts, orders: orders}
}

func (h *DiscountHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	codes, err := h.discounts.List(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list discount codes")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"discountCodes": codes})
}

func (h *DiscountHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body discountCodeBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	code, err := h.discounts.Create(r.Context(), body.toRequest(claims.SellerID))
	if errors.Is(err, store.ErrConflict) {
		writeError(w, http.StatusConflict, "Code already exists")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"discountCode": code})
}

func (h *DiscountHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var body discountCodeUpdateBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	code, err := h.discounts.Update(r.Context(), body.toUpdateRequest(claims.SellerID, id))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"discountCode": code})
}

func (h *DiscountHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	err := h.discounts.Delete(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, store.ErrDiscountInUse) {
		writeError(w, http.StatusConflict, "Code has been used and cannot be deleted")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not delete code")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DiscountHandler) ValidateCheckout(w http.ResponseWriter, r *http.Request) {
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

	preview, err := h.discounts.Preview(r.Context(), body.DropID, body.Code)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not validate code")
		return
	}
	writeJSON(w, http.StatusOK, preview)
}

type discountCodeBody struct {
	Code      string              `json:"code"`
	Type      domain.DiscountType `json:"type"`
	Value     int                 `json:"value"`
	MaxUses   *int                `json:"maxUses"`
	ExpiresAt *string             `json:"expiresAt"`
	DropID    *string             `json:"dropId"`
}

type discountCodeUpdateBody struct {
	Type      domain.DiscountType `json:"type"`
	Value     int                 `json:"value"`
	MaxUses   *int                `json:"maxUses"`
	ExpiresAt *string             `json:"expiresAt"`
	DropID    *string             `json:"dropId"`
	Active    bool                `json:"active"`
}

func parseDiscountExpiresAt(raw *string) *time.Time {
	if raw == nil || strings.TrimSpace(*raw) == "" {
		return nil
	}
	if t, err := time.Parse(time.RFC3339, *raw); err == nil {
		return &t
	}
	if t, err := time.Parse("2006-01-02", *raw); err == nil {
		end := t.Add(24*time.Hour - time.Second)
		return &end
	}
	return nil
}

func (b discountCodeBody) toRequest(sellerID string) service.CreateDiscountRequest {
	return service.CreateDiscountRequest{
		SellerID:  sellerID,
		Code:      b.Code,
		Type:      b.Type,
		Value:     b.Value,
		MaxUses:   b.MaxUses,
		ExpiresAt: parseDiscountExpiresAt(b.ExpiresAt),
		DropID:    b.DropID,
	}
}

func (b discountCodeUpdateBody) toUpdateRequest(sellerID, id string) service.UpdateDiscountRequest {
	return service.UpdateDiscountRequest{
		SellerID:  sellerID,
		ID:        id,
		Type:      b.Type,
		Value:     b.Value,
		MaxUses:   b.MaxUses,
		ExpiresAt: parseDiscountExpiresAt(b.ExpiresAt),
		DropID:    b.DropID,
		Active:    b.Active,
	}
}
