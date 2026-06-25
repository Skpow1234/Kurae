package service

import (
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

var referralCodePattern = regexp.MustCompile(`^[A-Z0-9_-]{3,32}$`)

type ReferralService struct {
	referrals *store.ReferralRepository
	drops     *store.DropRepository
	sellers   *store.SellerRepository
}

func NewReferralService(s *store.Store) *ReferralService {
	return &ReferralService{
		referrals: s.Referrals(),
		drops:     s.Drops(),
		sellers:   s.Sellers(),
	}
}

type CreateReferralRequest struct {
	SellerID string
	Code     string
	DropID   *string
}

func normalizeReferralCode(code string) (string, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if !referralCodePattern.MatchString(code) {
		return "", errors.New("code must be 3–32 characters: letters, numbers, underscore, or hyphen")
	}
	return code, nil
}

func (r *ReferralService) Create(ctx context.Context, req CreateReferralRequest) (domain.ReferralCode, error) {
	code, err := normalizeReferralCode(req.Code)
	if err != nil {
		return domain.ReferralCode{}, err
	}
	if req.DropID != nil && strings.TrimSpace(*req.DropID) != "" {
		if _, err := r.drops.GetByIDForSeller(ctx, *req.DropID, req.SellerID); err != nil {
			return domain.ReferralCode{}, errors.New("drop not found")
		}
	} else {
		req.DropID = nil
	}

	rec, err := r.referrals.Create(ctx, store.CreateReferralInput{
		SellerID: req.SellerID,
		Code:     code,
		DropID:   req.DropID,
	})
	if err != nil {
		return domain.ReferralCode{}, err
	}
	return rec.ToDomain(), nil
}

func (r *ReferralService) List(ctx context.Context, sellerID string) ([]domain.ReferralCode, error) {
	records, err := r.referrals.ListBySeller(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.ReferralCode, len(records))
	for i, rec := range records {
		out[i] = rec.ToDomain()
	}
	return out, nil
}

func (r *ReferralService) Delete(ctx context.Context, sellerID, id string) error {
	return r.referrals.DeleteForSeller(ctx, id, sellerID)
}

func (r *ReferralService) RecordClick(ctx context.Context, dropID, code string) error {
	drop, err := r.drops.GetByID(ctx, dropID)
	if errors.Is(err, store.ErrNotFound) {
		return err
	}
	if err != nil {
		return err
	}

	rec, err := r.referrals.LookupForAttribution(ctx, drop.SellerID, drop.ID, code)
	if errors.Is(err, store.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return r.referrals.RecordClick(ctx, rec.ID)
}

func (r *ReferralService) RecordSignup(ctx context.Context, sellerSlug, code string) error {
	if strings.TrimSpace(code) == "" || strings.TrimSpace(sellerSlug) == "" {
		return nil
	}
	seller, err := r.sellers.GetBySlug(ctx, sellerSlug)
	if errors.Is(err, store.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return r.referrals.RecordSignup(ctx, seller.ID, code)
}
