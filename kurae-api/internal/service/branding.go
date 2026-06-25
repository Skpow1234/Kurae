package service

import (
	"context"
	"errors"
	"strings"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
)

var ErrInvalidBrandAccent = errors.New("invalid accent color")

type BrandingService struct {
	sellers *store.SellerRepository
}

func NewBrandingService(s *store.Store) *BrandingService {
	return &BrandingService{sellers: s.Sellers()}
}

func (b *BrandingService) Get(ctx context.Context, sellerID string) (domain.SellerBranding, error) {
	return b.sellers.GetBranding(ctx, sellerID)
}

type UpdateBrandingRequest struct {
	SellerID string
	LogoURL  string
	Accent   string
	Bio      string
}

func (b *BrandingService) Update(ctx context.Context, req UpdateBrandingRequest) (domain.SellerBranding, error) {
	accent := strings.ToLower(strings.TrimSpace(req.Accent))
	if accent == "" {
		accent = domain.BrandAccentBlush
	}
	switch accent {
	case domain.BrandAccentBlush, domain.BrandAccentDusk, domain.BrandAccentTeal:
	default:
		return domain.SellerBranding{}, ErrInvalidBrandAccent
	}

	bio := validate.Trim(req.Bio)
	if len(bio) > 280 {
		return domain.SellerBranding{}, errors.New("bio must be 280 characters or less")
	}

	logoURL := strings.TrimSpace(req.LogoURL)
	if len(logoURL) > 2048 {
		return domain.SellerBranding{}, errors.New("logo URL is too long")
	}
	if logoURL != "" && !isAllowedBrandLogoURL(logoURL) {
		return domain.SellerBranding{}, errors.New("logo must be a valid image URL")
	}

	return b.sellers.UpdateBranding(ctx, req.SellerID, domain.SellerBranding{
		LogoURL: logoURL,
		Accent:  accent,
		Bio:     bio,
	})
}

func isAllowedBrandLogoURL(raw string) bool {
	if strings.HasPrefix(raw, "data:image/") {
		return len(raw) <= 500_000
	}
	lower := strings.ToLower(raw)
	return strings.HasPrefix(lower, "https://") || strings.HasPrefix(lower, "http://")
}
