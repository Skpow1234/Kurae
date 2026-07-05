package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type DropHandler struct {
	drops *service.DropService
	auth  *service.AuthService
}

func NewDropHandler(drops *service.DropService, auth *service.AuthService) *DropHandler {
	return &DropHandler{drops: drops, auth: auth}
}

func (h *DropHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	drops, err := h.drops.List(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list drops")
		return
	}

	type dropRow struct {
		domain.SellerDrop
		PublicStatus domain.DropStatus `json:"publicStatus"`
	}
	rows := make([]dropRow, len(drops))
	for i, d := range drops {
		rows[i] = dropRow{
			SellerDrop:   d,
			PublicStatus: d.Status,
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"drops": rows})
}

func (h *DropHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body dropBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	drop, err := h.drops.Create(r.Context(), body.toRequest(claims.SellerID))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"drop": drop})
}

func (h *DropHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	drop, err := h.drops.Get(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load drop")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"drop": drop})
}

func (h *DropHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	var body dropBody
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	drop, err := h.drops.Update(r.Context(), body.toRequest(claims.SellerID), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, store.ErrConflict) {
		writeError(w, http.StatusConflict, "Slug already in use")
		return
	}
	if errors.Is(err, store.ErrInvalidInventory) {
		writeError(w, http.StatusBadRequest, "Inventory total cannot be less than units already sold or reserved")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"drop": drop})
}

func (h *DropHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	err := h.drops.Delete(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, store.ErrDropHasOrders) {
		writeError(w, http.StatusConflict, "Drop has orders and cannot be deleted")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not delete drop")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DropHandler) Clone(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := chi.URLParam(r, "id")
	drop, err := h.drops.Clone(r.Context(), claims.SellerID, id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"drop": drop})
}

type dropBody struct {
	Title            string               `json:"title"`
	Slug             string               `json:"slug"`
	Description      string               `json:"description"`
	Story            string               `json:"story"`
	PriceCents       int                  `json:"priceCents"`
	InventoryTotal   int                  `json:"inventoryTotal"`
	StartsAt         string               `json:"startsAt"`
	EndsAt           string               `json:"endsAt"`
	PromoMessage     *string              `json:"promoMessage"`
	HeroImageURL     string               `json:"heroImageUrl"`
	GalleryImageURLs []string             `json:"galleryImageUrls"`
	Sizes            []domain.DropSize    `json:"sizes"`
	Products         []dropProductBody    `json:"products"`
	PublishStatus    domain.PublishStatus `json:"publishStatus"`
}

type dropProductBody struct {
	ID             string            `json:"id"`
	Slug           string            `json:"slug"`
	Name           string            `json:"name"`
	Description    string            `json:"description"`
	PriceCents     int               `json:"priceCents"`
	ImageURL       string            `json:"imageUrl"`
	SortOrder      int               `json:"sortOrder"`
	InventoryTotal int               `json:"inventoryTotal"`
	Sizes          []domain.DropSize `json:"sizes"`
}

func (b dropBody) toRequest(sellerID string) service.CreateDropRequest {
	startsAt, _ := time.Parse(time.RFC3339, b.StartsAt)
	endsAt, _ := time.Parse(time.RFC3339, b.EndsAt)
	products := make([]service.DropProductInput, len(b.Products))
	for i, p := range b.Products {
		products[i] = service.DropProductInput{
			ID:             p.ID,
			Slug:           p.Slug,
			Name:           p.Name,
			Description:    p.Description,
			PriceCents:     p.PriceCents,
			ImageURL:       p.ImageURL,
			SortOrder:      p.SortOrder,
			InventoryTotal: p.InventoryTotal,
			Sizes:          p.Sizes,
		}
	}
	return service.CreateDropRequest{
		SellerID:         sellerID,
		Slug:             b.Slug,
		Title:            b.Title,
		Description:      b.Description,
		Story:            b.Story,
		PromoMessage:     b.PromoMessage,
		PriceCents:       b.PriceCents,
		HeroImageURL:     b.HeroImageURL,
		GalleryImageURLs: b.GalleryImageURLs,
		InventoryTotal:   b.InventoryTotal,
		Sizes:            b.Sizes,
		Products:         products,
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		PublishStatus:    b.PublishStatus,
	}
}
