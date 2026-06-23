package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/kurae/kurae-api/internal/storage"
)

type UploadHandler struct {
	storage *storage.S3Storage
}

func NewUploadHandler(s *storage.S3Storage) *UploadHandler {
	return &UploadHandler{storage: s}
}

func (h *UploadHandler) Presign(w http.ResponseWriter, r *http.Request) {
	if h.storage == nil {
		writeError(w, http.StatusServiceUnavailable, "Image uploads are not configured")
		return
	}

	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Filename    string `json:"filename"`
		ContentType string `json:"contentType"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	result, err := h.storage.PresignUpload(r.Context(), claims.SellerID, strings.TrimSpace(body.Filename), body.ContentType)
	if errors.Is(err, storage.ErrInvalidMIME) {
		writeError(w, http.StatusBadRequest, "Only jpeg, png, and webp images are allowed")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not create upload URL")
		return
	}

	writeJSON(w, http.StatusOK, result)
}
