package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrWeakPassword       = errors.New("weak password")
)

const minPasswordLength = 8

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
	if len(in.Password) < minPasswordLength {
		return domain.SellerSession{}, "", ErrWeakPassword
	}

	email, err := validate.NormalizeEmail(in.Email)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(in.Name), " ", "-"))
	}
	slug, err = validate.NormalizeSlug(slug)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	seller, err := a.sellers.Create(ctx, email, string(hash), validate.Trim(in.Name), slug)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := sellerSession(seller)
	token, err := a.issueToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) Login(ctx context.Context, email, password string) (domain.SellerSession, string, error) {
	normalized, err := validate.NormalizeEmail(email)
	if err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}
	seller, err := a.sellers.GetByEmail(ctx, normalized)
	if errors.Is(err, store.ErrNotFound) {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(seller.PasswordHash), []byte(password)); err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}

	session := sellerSession(seller)
	token, err := a.issueToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) GetSession(ctx context.Context, sellerID string) (domain.SellerSession, error) {
	seller, err := a.sellers.GetByID(ctx, sellerID)
	if err != nil {
		return domain.SellerSession{}, err
	}
	return sellerSession(seller), nil
}

func (a *AuthService) UpdateProfile(ctx context.Context, sellerID, name string) (domain.SellerSession, string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return domain.SellerSession{}, "", errors.New("name is required")
	}

	seller, err := a.sellers.UpdateName(ctx, sellerID, name)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := sellerSession(seller)
	token, err := a.issueToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) ChangePassword(ctx context.Context, sellerID, currentPassword, newPassword string) error {
	if len(newPassword) < minPasswordLength {
		return ErrWeakPassword
	}

	seller, err := a.sellers.GetByID(ctx, sellerID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(seller.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return a.sellers.UpdatePasswordHash(ctx, sellerID, string(hash))
}

func sellerSession(seller domain.Seller) domain.SellerSession {
	return domain.SellerSession{
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
	}
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
