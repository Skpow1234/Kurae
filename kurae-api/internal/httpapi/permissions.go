package httpapi

import (
	"net/http"

	"github.com/kurae/kurae-api/internal/domain"
)

func RequirePermission(perm domain.Permission) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := claimsFromContext(r.Context())
			if !ok || !claims.Allows(perm) {
				writeError(w, http.StatusForbidden, "Insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
