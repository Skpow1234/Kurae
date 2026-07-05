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

type TeamHandler struct {
	team *service.TeamService
}

func NewTeamHandler(team *service.TeamService) *TeamHandler {
	return &TeamHandler{team: team}
}

func (h *TeamHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	members, err := h.team.List(r.Context(), claims.SellerID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not list team members")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"members": members})
}

func (h *TeamHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Email    string `json:"email"`
		Name     string `json:"name"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	member, err := h.team.Create(r.Context(), service.CreateTeamMemberRequest{
		SellerID: claims.SellerID,
		Email:    body.Email,
		Name:     body.Name,
		Password: body.Password,
		Role:     domain.TeamRole(strings.TrimSpace(body.Role)),
	})
	if errors.Is(err, store.ErrConflict) || errors.Is(err, service.ErrTeamEmailInUse) {
		writeError(w, http.StatusConflict, "Email already in use")
		return
	}
	if errors.Is(err, service.ErrInvalidTeamRole) {
		writeError(w, http.StatusBadRequest, "Role must be admin or staff")
		return
	}
	if errors.Is(err, service.ErrWeakPassword) {
		writeError(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"member": member})
}

func (h *TeamHandler) Update(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Name string `json:"name"`
		Role string `json:"role"`
	}
	if err := decodeJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	member, err := h.team.Update(r.Context(), service.UpdateTeamMemberRequest{
		SellerID: claims.SellerID,
		MemberID: chi.URLParam(r, "id"),
		Name:     body.Name,
		Role:     domain.TeamRole(strings.TrimSpace(body.Role)),
	})
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if errors.Is(err, service.ErrInvalidTeamRole) {
		writeError(w, http.StatusBadRequest, "Role must be admin or staff")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"member": member})
}

func (h *TeamHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	err := h.team.Delete(r.Context(), claims.SellerID, chi.URLParam(r, "id"))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusNotFound, "Not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Could not remove team member")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
