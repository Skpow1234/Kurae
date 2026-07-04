package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type ReferralRewardConfig struct {
	Enabled   bool
	Threshold int
	Type      domain.DiscountType
	Value     int
}

type BuyerReferralProgressRecord struct {
	BuyerID             string
	SellerID            string
	SellerSlug          string
	SellerName          string
	Code                string
	SuccessfulReferrals int
	Config              ReferralRewardConfig
}

type BuyerReferralRewardRecord struct {
	Code       string
	RewardTier int
	Type       domain.DiscountType
	Value      int
	GrantedAt  time.Time
	Redeemed   bool
}

func (r *ReferralRepository) GetRewardConfig(ctx context.Context, sellerID string) (ReferralRewardConfig, error) {
	var cfg ReferralRewardConfig
	err := r.store.pool.QueryRow(ctx, `
		SELECT referral_rewards_enabled, referral_reward_threshold,
			referral_reward_type, referral_reward_value
		FROM sellers WHERE id = $1
	`, sellerID).Scan(&cfg.Enabled, &cfg.Threshold, &cfg.Type, &cfg.Value)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReferralRewardConfig{}, ErrNotFound
	}
	return cfg, err
}

func (r *ReferralRepository) UpdateRewardConfig(ctx context.Context, sellerID string, cfg ReferralRewardConfig) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE sellers
		SET referral_rewards_enabled = $2,
		    referral_reward_threshold = $3,
		    referral_reward_type = $4,
		    referral_reward_value = $5
		WHERE id = $1
	`, sellerID, cfg.Enabled, cfg.Threshold, cfg.Type, cfg.Value)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func buyerReferralCodeSeed(buyerID string) string {
	compact := strings.ToUpper(strings.ReplaceAll(buyerID, "-", ""))
	if len(compact) > 8 {
		compact = compact[:8]
	}
	return "B" + compact
}

func (r *ReferralRepository) GetOrCreateBuyerCode(ctx context.Context, buyerID, sellerID string) (ReferralRecord, error) {
	row := r.store.pool.QueryRow(ctx, referralSelect+`
		WHERE rc.seller_id = $1 AND rc.buyer_id = $2
	`, sellerID, buyerID)
	rec, err := r.scanReferral(row)
	if err == nil {
		return rec, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return ReferralRecord{}, err
	}

	code := buyerReferralCodeSeed(buyerID)
	for attempt := 0; attempt < 5; attempt++ {
		if attempt > 0 {
			suffix := strings.ToUpper(strings.ReplaceAll(buyerID, "-", ""))
			if len(suffix) > 6 {
				suffix = suffix[:6]
			}
			code = fmt.Sprintf("B%s%d", suffix, attempt)
		}

		var id string
		insertErr := r.store.pool.QueryRow(ctx, `
			INSERT INTO referral_codes (seller_id, code, buyer_id)
			VALUES ($1, $2, $3)
			RETURNING id
		`, sellerID, code, buyerID).Scan(&id)
		if insertErr == nil {
			return r.GetByID(ctx, id)
		}
		if isUniqueViolation(insertErr) {
			row = r.store.pool.QueryRow(ctx, referralSelect+`
				WHERE rc.seller_id = $1 AND rc.buyer_id = $2
			`, sellerID, buyerID)
			rec, selErr := r.scanReferral(row)
			if selErr == nil {
				return rec, nil
			}
			continue
		}
		return ReferralRecord{}, insertErr
	}

	return ReferralRecord{}, ErrConflict
}

func (r *ReferralRepository) GetByID(ctx context.Context, id string) (ReferralRecord, error) {
	row := r.store.pool.QueryRow(ctx, referralSelect+` WHERE rc.id = $1`, id)
	rec, err := r.scanReferral(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReferralRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *ReferralRepository) GetBuyerIDForCode(ctx context.Context, referralCodeID string) (*string, error) {
	var buyerID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT buyer_id FROM referral_codes WHERE id = $1
	`, referralCodeID).Scan(&buyerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	return buyerID, err
}

func (r *ReferralRepository) ProcessBuyerReferralRewardTx(ctx context.Context, tx pgx.Tx, orderID string) error {
	var sellerID, buyerEmail string
	var referralCodeID *string
	err := tx.QueryRow(ctx, `
		SELECT o.seller_id, o.buyer_email, o.referral_code_id
		FROM orders o
		WHERE o.id = $1
	`, orderID).Scan(&sellerID, &buyerEmail, &referralCodeID)
	if err != nil {
		return err
	}
	if referralCodeID == nil {
		return nil
	}

	var referrerBuyerID *string
	err = tx.QueryRow(ctx, `
		SELECT buyer_id FROM referral_codes WHERE id = $1
	`, *referralCodeID).Scan(&referrerBuyerID)
	if errors.Is(err, pgx.ErrNoRows) || referrerBuyerID == nil {
		return nil
	}
	if err != nil {
		return err
	}

	var referrerEmail string
	if err := tx.QueryRow(ctx, `
		SELECT email FROM buyers WHERE id = $1
	`, *referrerBuyerID).Scan(&referrerEmail); err != nil {
		return err
	}
	if strings.EqualFold(strings.TrimSpace(referrerEmail), strings.TrimSpace(buyerEmail)) {
		return nil
	}

	var cfg ReferralRewardConfig
	if err := tx.QueryRow(ctx, `
		SELECT referral_rewards_enabled, referral_reward_threshold,
			referral_reward_type, referral_reward_value
		FROM sellers WHERE id = $1
	`, sellerID).Scan(&cfg.Enabled, &cfg.Threshold, &cfg.Type, &cfg.Value); err != nil {
		return err
	}
	if !cfg.Enabled || cfg.Threshold < 1 {
		return nil
	}

	var newCount int
	err = tx.QueryRow(ctx, `
		INSERT INTO buyer_referral_progress (buyer_id, seller_id, successful_referrals)
		VALUES ($1, $2, 1)
		ON CONFLICT (buyer_id, seller_id) DO UPDATE
		SET successful_referrals = buyer_referral_progress.successful_referrals + 1,
		    updated_at = now()
		RETURNING successful_referrals
	`, *referrerBuyerID, sellerID).Scan(&newCount)
	if err != nil {
		return err
	}

	if newCount%cfg.Threshold != 0 {
		return nil
	}

	rewardTier := newCount / cfg.Threshold
	var exists bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM buyer_referral_rewards
			WHERE buyer_id = $1 AND seller_id = $2 AND reward_tier = $3
		)
	`, *referrerBuyerID, sellerID, rewardTier).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	rewardCode := fmt.Sprintf("REF%d-%s", rewardTier, strings.ToUpper(strings.ReplaceAll(*referrerBuyerID, "-", ""))[:8])
	maxUses := 1
	var discountID string
	err = tx.QueryRow(ctx, `
		INSERT INTO discount_codes (seller_id, code, type, value, max_uses, active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id
	`, sellerID, rewardCode, cfg.Type, cfg.Value, maxUses).Scan(&discountID)
	if err != nil {
		if isUniqueViolation(err) {
			rewardCode = fmt.Sprintf("REF%d-%s", rewardTier, strings.ToUpper(strings.ReplaceAll(orderID, "-", ""))[:8])
			if err := tx.QueryRow(ctx, `
				INSERT INTO discount_codes (seller_id, code, type, value, max_uses, active)
				VALUES ($1, $2, $3, $4, $5, true)
				RETURNING id
			`, sellerID, rewardCode, cfg.Type, cfg.Value, maxUses).Scan(&discountID); err != nil {
				return err
			}
		} else {
			return err
		}
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO buyer_referral_rewards (buyer_id, seller_id, discount_code_id, reward_tier)
		VALUES ($1, $2, $3, $4)
	`, *referrerBuyerID, sellerID, discountID, rewardTier)
	return err
}

func (r *ReferralRepository) ListBuyerProgress(ctx context.Context, buyerID string) ([]BuyerReferralProgressRecord, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT s.id, s.slug, s.name, rc.code,
			COALESCE(brp.successful_referrals, 0),
			s.referral_rewards_enabled, s.referral_reward_threshold,
			s.referral_reward_type, s.referral_reward_value
		FROM referral_codes rc
		JOIN sellers s ON s.id = rc.seller_id
		LEFT JOIN buyer_referral_progress brp
			ON brp.seller_id = s.id AND brp.buyer_id = rc.buyer_id
		WHERE rc.buyer_id = $1
		ORDER BY COALESCE(brp.updated_at, rc.created_at) DESC
	`, buyerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []BuyerReferralProgressRecord
	for rows.Next() {
		var rec BuyerReferralProgressRecord
		rec.BuyerID = buyerID
		if err := rows.Scan(
			&rec.SellerID, &rec.SellerSlug, &rec.SellerName,
			&rec.Code, &rec.SuccessfulReferrals,
			&rec.Config.Enabled, &rec.Config.Threshold,
			&rec.Config.Type, &rec.Config.Value,
		); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *ReferralRepository) GetBuyerProgressForSeller(ctx context.Context, buyerID, sellerID string) (BuyerReferralProgressRecord, error) {
	rec, err := r.GetOrCreateBuyerCode(ctx, buyerID, sellerID)
	if err != nil {
		return BuyerReferralProgressRecord{}, err
	}

	var progress BuyerReferralProgressRecord
	progress.BuyerID = buyerID
	progress.SellerID = sellerID
	progress.Code = rec.Code

	err = r.store.pool.QueryRow(ctx, `
		SELECT s.slug, s.name,
			COALESCE(brp.successful_referrals, 0),
			s.referral_rewards_enabled, s.referral_reward_threshold,
			s.referral_reward_type, s.referral_reward_value
		FROM sellers s
		LEFT JOIN buyer_referral_progress brp
			ON brp.seller_id = s.id AND brp.buyer_id = $2
		WHERE s.id = $1
	`, sellerID, buyerID).Scan(
		&progress.SellerSlug, &progress.SellerName,
		&progress.SuccessfulReferrals,
		&progress.Config.Enabled, &progress.Config.Threshold,
		&progress.Config.Type, &progress.Config.Value,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return BuyerReferralProgressRecord{}, ErrNotFound
	}
	if err != nil {
		return BuyerReferralProgressRecord{}, err
	}
	return progress, nil
}

func (r *ReferralRepository) ListBuyerRewards(ctx context.Context, buyerID, sellerID string) ([]BuyerReferralRewardRecord, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT dc.code, brr.reward_tier, dc.type, dc.value, brr.granted_at,
			(dc.max_uses IS NOT NULL AND dc.uses_count >= dc.max_uses) AS redeemed
		FROM buyer_referral_rewards brr
		JOIN discount_codes dc ON dc.id = brr.discount_code_id
		WHERE brr.buyer_id = $1 AND brr.seller_id = $2
		ORDER BY brr.reward_tier ASC
	`, buyerID, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []BuyerReferralRewardRecord
	for rows.Next() {
		var rec BuyerReferralRewardRecord
		if err := rows.Scan(&rec.Code, &rec.RewardTier, &rec.Type, &rec.Value, &rec.GrantedAt, &rec.Redeemed); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *ReferralRepository) IsSelfReferral(ctx context.Context, referralCodeID, buyerEmail string) (bool, error) {
	var referrerBuyerID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT buyer_id FROM referral_codes WHERE id = $1
	`, referralCodeID).Scan(&referrerBuyerID)
	if errors.Is(err, pgx.ErrNoRows) || referrerBuyerID == nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	var referrerEmail string
	if err := r.store.pool.QueryRow(ctx, `
		SELECT email FROM buyers WHERE id = $1
	`, *referrerBuyerID).Scan(&referrerEmail); err != nil {
		return false, err
	}
	return strings.EqualFold(strings.TrimSpace(referrerEmail), strings.TrimSpace(buyerEmail)), nil
}
