package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnauthorized       = errors.New("unauthorized")
)

type AuthService struct {
	sellers   *store.SellerRepository
	jwtSecret []byte
}

func NewAuthService(s *store.Store, jwtSecret string) *AuthService {
	return &AuthService{
		sellers:   s.Sellers(),
		jwtSecret: []byte(jwtSecret),
	}
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Slug     string
}

func (a *AuthService) Register(ctx context.Context, in RegisterInput) (domain.SellerSession, string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(in.Name), " ", "-"))
	}

	seller, err := a.sellers.Create(ctx, in.Email, string(hash), strings.TrimSpace(in.Name), slug)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := domain.SellerSession{
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
	}
	token, err := a.issueToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) Login(ctx context.Context, email, password string) (domain.SellerSession, string, error) {
	seller, err := a.sellers.GetByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(seller.PasswordHash), []byte(password)); err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}

	session := domain.SellerSession{
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
	}
	token, err := a.issueToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

type AuthClaims struct {
	SellerID   string `json:"sellerId"`
	Email      string `json:"email"`
	SellerSlug string `json:"sellerSlug"`
	SellerName string `json:"sellerName"`
	jwt.RegisteredClaims
}

func (a *AuthService) ParseToken(tokenStr string) (AuthClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (any, error) {
		return a.jwtSecret, nil
	})
	if err != nil {
		return AuthClaims{}, ErrUnauthorized
	}
	c, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return AuthClaims{}, ErrUnauthorized
	}
	return *c, nil
}

func (a *AuthService) issueToken(seller domain.Seller) (string, error) {
	c := AuthClaims{
		SellerID:   seller.ID,
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(a.jwtSecret)
}
