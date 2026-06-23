package httpapi

import (
	"errors"
	"net/http"
	"strings"

	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
)

type AuthHandler struct {
	auth *service.AuthService
}

func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		Name     string `json:"name"`
		Slug     string `json:"slug"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(body.Email) == "" || body.Password == "" || strings.TrimSpace(body.Name) == "" {
		writeError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	session, token, err := h.auth.Register(r.Context(), service.RegisterInput{
		Email:    body.Email,
		Password: body.Password,
		Name:     body.Name,
		Slug:     body.Slug,
	})
	if errors.Is(err, store.ErrConflict) {
		writeError(w, http.StatusConflict, "Account already exists")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not register")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"ok":      true,
		"session": session,
		"token":   token,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}
	if strings.TrimSpace(body.Email) == "" || body.Password == "" {
		writeError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	session, token, err := h.auth.Login(r.Context(), body.Email, body.Password)
	if errors.Is(err, service.ErrInvalidCredentials) {
		writeError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not login")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"session": session,
		"token":   token,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
