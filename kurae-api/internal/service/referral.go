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

func (r *ReferralService) RecordSellerClick(ctx context.Context, sellerSlug, code string) error {
	seller, err := r.sellers.GetBySlug(ctx, sellerSlug)
	if errors.Is(err, store.ErrNotFound) {
		return err
	}
	if err != nil {
		return err
	}

	normalized, err := normalizeReferralCode(code)
	if err != nil {
		return nil
	}

	rec, err := r.referrals.LookupForAttribution(ctx, seller.ID, "", normalized)
	if errors.Is(err, store.ErrNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	if rec.DropID != nil {
		return nil
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

func (r *ReferralService) GetStats(ctx context.Context, dropID, code string) (domain.ReferralStats, error) {
	drop, err := r.drops.GetByID(ctx, dropID)
	if errors.Is(err, store.ErrNotFound) {
		return domain.ReferralStats{Valid: false}, nil
	}
	if err != nil {
		return domain.ReferralStats{}, err
	}

	normalized, err := normalizeReferralCode(code)
	if err != nil {
		return domain.ReferralStats{Valid: false}, nil
	}

	rec, err := r.referrals.LookupForAttribution(ctx, drop.SellerID, drop.ID, normalized)
	if errors.Is(err, store.ErrNotFound) {
		return domain.ReferralStats{Valid: false}, nil
	}
	if err != nil {
		return domain.ReferralStats{}, err
	}

	return domain.ReferralStats{
		Valid:        true,
		Code:         rec.Code,
		ClicksCount:  rec.ClicksCount,
		SignupsCount: rec.SignupsCount,
		OrdersCount:  rec.OrdersCount,
	}, nil
}

func (r *ReferralService) GetRewardSettings(ctx context.Context, sellerID string) (domain.ReferralRewardSettings, error) {
	cfg, err := r.referrals.GetRewardConfig(ctx, sellerID)
	if err != nil {
		return domain.ReferralRewardSettings{}, err
	}
	return domain.ReferralRewardSettings{
		Enabled:   cfg.Enabled,
		Threshold: cfg.Threshold,
		Type:      cfg.Type,
		Value:     cfg.Value,
	}, nil
}

type UpdateReferralRewardSettingsRequest struct {
	SellerID  string
	Enabled   bool
	Threshold int
	Type      domain.DiscountType
	Value     int
}

func (r *ReferralService) UpdateRewardSettings(ctx context.Context, req UpdateReferralRewardSettingsRequest) (domain.ReferralRewardSettings, error) {
	if req.Threshold < 1 || req.Threshold > 100 {
		return domain.ReferralRewardSettings{}, errors.New("threshold must be between 1 and 100")
	}
	if req.Type != domain.DiscountPercent && req.Type != domain.DiscountFixed {
		return domain.ReferralRewardSettings{}, errors.New("type must be percent or fixed")
	}
	if req.Value < 1 {
		return domain.ReferralRewardSettings{}, errors.New("value must be at least 1")
	}
	if req.Type == domain.DiscountPercent && req.Value > 100 {
		return domain.ReferralRewardSettings{}, errors.New("percent value cannot exceed 100")
	}

	cfg := store.ReferralRewardConfig{
		Enabled:   req.Enabled,
		Threshold: req.Threshold,
		Type:      req.Type,
		Value:     req.Value,
	}
	if err := r.referrals.UpdateRewardConfig(ctx, req.SellerID, cfg); err != nil {
		return domain.ReferralRewardSettings{}, err
	}
	return domain.ReferralRewardSettings{
		Enabled:   cfg.Enabled,
		Threshold: cfg.Threshold,
		Type:      cfg.Type,
		Value:     cfg.Value,
	}, nil
}

func progressToDomain(rec store.BuyerReferralProgressRecord, rewards []store.BuyerReferralRewardRecord) domain.BuyerReferralProgress {
	progressInTier := 0
	referralsUntil := rec.Config.Threshold
	if rec.Config.Threshold > 0 {
		if rec.SuccessfulReferrals == 0 {
			referralsUntil = rec.Config.Threshold
		} else {
			progressInTier = rec.SuccessfulReferrals % rec.Config.Threshold
			if progressInTier == 0 {
				referralsUntil = rec.Config.Threshold
			} else {
				referralsUntil = rec.Config.Threshold - progressInTier
			}
		}
	}

	earned := make([]domain.BuyerReferralRewardItem, len(rewards))
	for i, reward := range rewards {
		earned[i] = domain.BuyerReferralRewardItem{
			Code:       reward.Code,
			RewardTier: reward.RewardTier,
			Type:       reward.Type,
			Value:      reward.Value,
			GrantedAt:  reward.GrantedAt.UTC().Format(time.RFC3339),
			Redeemed:   reward.Redeemed,
		}
	}

	return domain.BuyerReferralProgress{
		SellerSlug:          rec.SellerSlug,
		SellerName:          rec.SellerName,
		Code:                rec.Code,
		SuccessfulReferrals: rec.SuccessfulReferrals,
		Threshold:           rec.Config.Threshold,
		RewardsEnabled:      rec.Config.Enabled,
		RewardType:          rec.Config.Type,
		RewardValue:         rec.Config.Value,
		ProgressInTier:      progressInTier,
		ReferralsUntilReward: referralsUntil,
		EarnedRewards:       earned,
	}
}

func (r *ReferralService) GetBuyerProgressForSeller(ctx context.Context, buyerID, sellerSlug string) (domain.BuyerReferralProgress, error) {
	seller, err := r.sellers.GetBySlug(ctx, sellerSlug)
	if errors.Is(err, store.ErrNotFound) {
		return domain.BuyerReferralProgress{}, err
	}
	if err != nil {
		return domain.BuyerReferralProgress{}, err
	}

	progress, err := r.referrals.GetBuyerProgressForSeller(ctx, buyerID, seller.ID)
	if err != nil {
		return domain.BuyerReferralProgress{}, err
	}
	rewards, err := r.referrals.ListBuyerRewards(ctx, buyerID, seller.ID)
	if err != nil {
		return domain.BuyerReferralProgress{}, err
	}
	return progressToDomain(progress, rewards), nil
}

func (r *ReferralService) ListBuyerProgress(ctx context.Context, buyerID string) ([]domain.BuyerReferralProgress, error) {
	records, err := r.referrals.ListBuyerProgress(ctx, buyerID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.BuyerReferralProgress, 0, len(records))
	for _, rec := range records {
		rewards, err := r.referrals.ListBuyerRewards(ctx, buyerID, rec.SellerID)
		if err != nil {
			return nil, err
		}
		out = append(out, progressToDomain(rec, rewards))
	}
	return out, nil
}
