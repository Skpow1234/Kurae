package service

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/redis/go-redis/v9"
)

func testAuthService(rdb redis.Cmdable) *AuthService {
	return &AuthService{
		jwtSecret: []byte("test-secret-at-least-32-chars-long!!"),
		rdb:       rdb,
	}
}

func TestParseTokenRejectsUnexpectedAlgorithm(t *testing.T) {
	t.Parallel()

	auth := testAuthService(nil)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, AuthClaims{
		Role:  "buyer",
		Email: "a@b.c",
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.NewString(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	})
	signed, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}

	_, err = auth.ParseToken(signed)
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("expected ErrUnauthorized for alg=none, got %v", err)
	}
}

func TestIssueTokenIncludesJTIAndParses(t *testing.T) {
	t.Parallel()

	auth := testAuthService(nil)
	token, err := auth.issueBuyerToken(domain.Buyer{
		ID:    uuid.NewString(),
		Email: "buyer@test.local",
		Name:  "Buyer",
	})
	if err != nil {
		t.Fatal(err)
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if claims.ID == "" {
		t.Fatal("expected jti on issued token")
	}
	if claims.Role != "buyer" {
		t.Fatalf("expected buyer role, got %s", claims.Role)
	}
}

func TestRevokeTokenRejectsOnParseWhenRedisConfigured(t *testing.T) {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		t.Skip("REDIS_URL not set")
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		t.Fatal(err)
	}
	client := redis.NewClient(opts)
	t.Cleanup(func() { _ = client.Close() })

	auth := testAuthService(client)
	token, err := auth.issueBuyerToken(domain.Buyer{
		ID:    uuid.NewString(),
		Email: "revoke@test.local",
		Name:  "Revoke",
	})
	if err != nil {
		t.Fatal(err)
	}

	claims, err := auth.ParseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if err := auth.RevokeToken(context.Background(), claims); err != nil {
		t.Fatal(err)
	}

	_, err = auth.ParseToken(token)
	if !errors.Is(err, ErrUnauthorized) {
		t.Fatalf("expected revoked token to fail parse, got %v", err)
	}
}

func TestRevokeTokenNoopWithoutRedis(t *testing.T) {
	t.Parallel()

	auth := testAuthService(nil)
	token, err := auth.issueOwnerToken(domain.Seller{
		ID:    uuid.NewString(),
		Email: "seller@test.local",
		Name:  "Seller",
		Slug:  "seller",
	})
	if err != nil {
		t.Fatal(err)
	}
	claims, err := auth.ParseToken(token)
	if err != nil {
		t.Fatal(err)
	}
	if err := auth.RevokeToken(context.Background(), claims); err != nil {
		t.Fatal(err)
	}
	if _, err := auth.ParseToken(token); err != nil {
		t.Fatalf("expected token still valid without Redis, got %v", err)
	}
}
