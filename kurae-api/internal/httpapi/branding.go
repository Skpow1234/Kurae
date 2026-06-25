package httpapi

import (
	"errors"
	"net/http"

	"github.com/kurae/kurae-api/internal/service"
)

type BrandingHandler struct {
	branding *service.BrandingService
}

func NewBrandingHandler(branding *service.BrandingService) *BrandingHandler {
	return &BrandingHandler{branding: branding}
}

func (h *BrandingHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	branding, err := h.branding.Get(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not load branding")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"branding": branding})
}

func (h *BrandingHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		LogoURL string `json:"logoUrl"`
		Accent  string `json:"accent"`
		Bio     string `json:"bio"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	branding, err := h.branding.Update(r.Context(), service.UpdateBrandingRequest{
		SellerID: claims.SellerID,
		LogoURL:  body.LogoURL,
		Accent:   body.Accent,
		Bio:      body.Bio,
	})
	if errors.Is(err, service.ErrInvalidBrandAccent) {
		writeError(w, http.StatusBadRequest, "Invalid accent color")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"branding": branding})
}
