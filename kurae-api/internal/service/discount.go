package service

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

var discountCodePattern = regexp.MustCompile(`^[A-Z0-9_-]{3,32}$`)

type DiscountService struct {
	discounts *store.DiscountRepository
	drops     *store.DropRepository
}

func NewDiscountService(s *store.Store) *DiscountService {
	return &DiscountService{
		discounts: s.Discounts(),
		drops:     s.Drops(),
	}
}

type CreateDiscountRequest struct {
	SellerID  string
	Code      string
	Type      domain.DiscountType
	Value     int
	MaxUses   *int
	ExpiresAt *time.Time
	DropID    *string
}

type UpdateDiscountRequest struct {
	SellerID  string
	ID        string
	Type      domain.DiscountType
	Value     int
	MaxUses   *int
	ExpiresAt *time.Time
	DropID    *string
	Active    bool
}

func normalizeDiscountCode(code string) (string, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if !discountCodePattern.MatchString(code) {
		return "", errors.New("code must be 3–32 characters: letters, numbers, underscore, or hyphen")
	}
	return code, nil
}

func (d *DiscountService) Create(ctx context.Context, req CreateDiscountRequest) (domain.DiscountCode, error) {
	code, err := normalizeDiscountCode(req.Code)
	if err != nil {
		return domain.DiscountCode{}, err
	}
	if err := validateDiscountFields(struct {
		Type    domain.DiscountType
		Value   int
		MaxUses *int
	}{req.Type, req.Value, req.MaxUses}); err != nil {
		return domain.DiscountCode{}, err
	}
	if req.DropID != nil && strings.TrimSpace(*req.DropID) != "" {
		if _, err := d.drops.GetByIDForSeller(ctx, *req.DropID, req.SellerID); err != nil {
			return domain.DiscountCode{}, errors.New("drop not found")
		}
	} else {
		req.DropID = nil
	}

	rec, err := d.discounts.Create(ctx, store.CreateDiscountInput{
		SellerID:  req.SellerID,
		Code:      code,
		Type:      req.Type,
		Value:     req.Value,
		MaxUses:   req.MaxUses,
		ExpiresAt: req.ExpiresAt,
		DropID:    req.DropID,
	})
	if err != nil {
		return domain.DiscountCode{}, err
	}
	return rec.ToDomain(), nil
}

func validateDiscountFields(req struct {
	Type    domain.DiscountType
	Value   int
	MaxUses *int
}) error {
	if req.Type != domain.DiscountPercent && req.Type != domain.DiscountFixed {
		return errors.New("type must be percent or fixed")
	}
	if req.Type == domain.DiscountPercent && (req.Value < 1 || req.Value > 100) {
		return errors.New("percent value must be between 1 and 100")
	}
	if req.Type == domain.DiscountFixed && req.Value < 1 {
		return errors.New("fixed discount must be at least 1 cent")
	}
	if req.MaxUses != nil && *req.MaxUses < 1 {
		return errors.New("max uses must be at least 1")
	}
	return nil
}

func (d *DiscountService) Update(ctx context.Context, req UpdateDiscountRequest) (domain.DiscountCode, error) {
	existing, err := d.discounts.GetByIDForSeller(ctx, req.ID, req.SellerID)
	if err != nil {
		return domain.DiscountCode{}, err
	}
	if existing.UsesCount > 0 && (existing.Type != req.Type || existing.Value != req.Value) {
		return domain.DiscountCode{}, errors.New("discount amount cannot change after a code has been used")
	}
	if err := validateDiscountFields(struct {
		Type    domain.DiscountType
		Value   int
		MaxUses *int
	}{req.Type, req.Value, req.MaxUses}); err != nil {
		return domain.DiscountCode{}, err
	}
	if req.MaxUses != nil && *req.MaxUses < existing.UsesCount {
		return domain.DiscountCode{}, errors.New("max uses cannot be less than current uses")
	}
	if req.DropID != nil && strings.TrimSpace(*req.DropID) != "" {
		if _, err := d.drops.GetByIDForSeller(ctx, *req.DropID, req.SellerID); err != nil {
			return domain.DiscountCode{}, errors.New("drop not found")
		}
	} else {
		req.DropID = nil
	}

	rec, err := d.discounts.UpdateForSeller(ctx, req.ID, req.SellerID, store.UpdateDiscountInput{
		Type:      req.Type,
		Value:     req.Value,
		MaxUses:   req.MaxUses,
		ExpiresAt: req.ExpiresAt,
		DropID:    req.DropID,
		Active:    req.Active,
	})
	if err != nil {
		return domain.DiscountCode{}, err
	}
	return rec.ToDomain(), nil
}

func (d *DiscountService) List(ctx context.Context, sellerID string) ([]domain.DiscountCode, error) {
	records, err := d.discounts.ListBySeller(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.DiscountCode, len(records))
	for i, rec := range records {
		out[i] = rec.ToDomain()
	}
	return out, nil
}

func (d *DiscountService) Delete(ctx context.Context, sellerID, id string) error {
	return d.discounts.DeleteForSeller(ctx, id, sellerID)
}

func (d *DiscountService) Preview(ctx context.Context, dropID, code string) (domain.DiscountPreview, error) {
	drop, err := d.drops.GetByID(ctx, dropID)
	if errors.Is(err, store.ErrNotFound) {
		return domain.DiscountPreview{Valid: false, Message: "Drop not found"}, nil
	}
	if err != nil {
		return domain.DiscountPreview{}, err
	}

	normalized, err := normalizeDiscountCode(code)
	if err != nil {
		return domain.DiscountPreview{Valid: false, Message: err.Error()}, nil
	}

	rec, err := d.discounts.LookupForCheckout(ctx, drop.SellerID, drop.ID, normalized)
	if err != nil {
		return domain.DiscountPreview{
			Valid:         false,
			SubtotalCents: drop.PriceCents,
			FinalCents:    drop.PriceCents,
			Currency:      drop.Currency,
			Message:       "Invalid or expired code",
		}, nil
	}

	discountCents := store.ComputeDiscountCents(drop.PriceCents, rec.Type, rec.Value)
	final := drop.PriceCents - discountCents
	if final < 0 {
		final = 0
	}

	return domain.DiscountPreview{
		Valid:         true,
		Code:          rec.Code,
		DiscountCents: discountCents,
		SubtotalCents: drop.PriceCents,
		FinalCents:    final,
		Currency:      drop.Currency,
	}, nil
}
