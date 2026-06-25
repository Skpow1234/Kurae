package httpapi

import (
	"context"
	"net/http"
	"strings"

	"github.com/kurae/kurae-api/internal/service"
)

type contextKey string

const sellerClaimsKey contextKey = "sellerClaims"

func AuthMiddleware(auth *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				writeError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			claims, err := auth.ParseToken(token)
			if err != nil {
				writeError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			ctx := context.WithValue(r.Context(), sellerClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func SellerAuthMiddleware(auth *service.AuthService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			token := bearerToken(r)
			if token == "" {
				writeError(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			claims, err := auth.ParseToken(token)
			if err != nil || !claims.IsSeller() {
				writeError(w, http.StatusForbidden, "Seller account required")
				return
			}
			ctx := context.WithValue(r.Context(), sellerClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(h, "Bearer "))
	}
	return ""
}

func claimsFromContext(ctx context.Context) (service.AuthClaims, bool) {
	c, ok := ctx.Value(sellerClaimsKey).(service.AuthClaims)
	return c, ok
}
