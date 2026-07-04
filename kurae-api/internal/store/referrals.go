package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

var ErrReferralInUse = errors.New("referral code has activity and cannot be deleted")

type ReferralRepository struct {
	store *Store
}

func (s *Store) Referrals() *ReferralRepository {
	return &ReferralRepository{store: s}
}

type ReferralRecord struct {
	ID           string
	SellerID     string
	BuyerID      *string
	Code         string
	DropID       *string
	DropTitle    *string
	DropSlug     *string
	ClicksCount  int
	SignupsCount int
	OrdersCount  int
	CreatedAt    time.Time
}

type CreateReferralInput struct {
	SellerID string
	Code     string
	DropID   *string
}

const referralSelect = `
	SELECT rc.id, rc.seller_id, rc.buyer_id, rc.code, rc.drop_id, d.title, d.slug,
		rc.clicks_count, rc.signups_count, rc.orders_count, rc.created_at
	FROM referral_codes rc
	LEFT JOIN drops d ON d.id = rc.drop_id
`

func (r *ReferralRepository) scanReferral(row pgx.Row) (ReferralRecord, error) {
	var rec ReferralRecord
	var dropTitle, dropSlug *string
	if err := row.Scan(
		&rec.ID, &rec.SellerID, &rec.BuyerID, &rec.Code, &rec.DropID, &dropTitle, &dropSlug,
		&rec.ClicksCount, &rec.SignupsCount, &rec.OrdersCount, &rec.CreatedAt,
	); err != nil {
		return ReferralRecord{}, err
	}
	rec.DropTitle = dropTitle
	rec.DropSlug = dropSlug
	return rec, nil
}

func validateReferralScope(rec ReferralRecord, dropID string) bool {
	if dropID == "" {
		return true
	}
	if rec.DropID != nil && *rec.DropID != dropID {
		return false
	}
	return true
}

func (r *ReferralRepository) ListBySeller(ctx context.Context, sellerID string) ([]ReferralRecord, error) {
	rows, err := r.store.pool.Query(ctx, referralSelect+`
		WHERE rc.seller_id = $1 AND rc.buyer_id IS NULL
		ORDER BY rc.created_at DESC
	`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []ReferralRecord
	for rows.Next() {
		rec, err := r.scanReferral(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *ReferralRepository) Create(ctx context.Context, in CreateReferralInput) (ReferralRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO referral_codes (seller_id, code, drop_id)
		VALUES ($1, $2, $3)
		RETURNING id
	`, in.SellerID, in.Code, in.DropID)

	var id string
	if err := row.Scan(&id); err != nil {
		if isUniqueViolation(err) {
			return ReferralRecord{}, ErrConflict
		}
		return ReferralRecord{}, err
	}
	return r.GetByIDForSeller(ctx, id, in.SellerID)
}

func (r *ReferralRepository) GetByIDForSeller(ctx context.Context, id, sellerID string) (ReferralRecord, error) {
	row := r.store.pool.QueryRow(ctx, referralSelect+` WHERE rc.id = $1 AND rc.seller_id = $2`, id, sellerID)
	rec, err := r.scanReferral(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReferralRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *ReferralRepository) DeleteForSeller(ctx context.Context, id, sellerID string) error {
	var clicks, signups, orders int
	err := r.store.pool.QueryRow(ctx, `
		SELECT clicks_count, signups_count, orders_count
		FROM referral_codes WHERE id = $1 AND seller_id = $2
	`, id, sellerID).Scan(&clicks, &signups, &orders)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if clicks > 0 || signups > 0 || orders > 0 {
		return ErrReferralInUse
	}

	tag, err := r.store.pool.Exec(ctx, `
		DELETE FROM referral_codes WHERE id = $1 AND seller_id = $2
	`, id, sellerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ReferralRepository) LookupForAttribution(ctx context.Context, sellerID, dropID, code string) (ReferralRecord, error) {
	row := r.store.pool.QueryRow(ctx, referralSelect+`
		WHERE rc.seller_id = $1 AND rc.code = $2
	`, sellerID, strings.ToUpper(strings.TrimSpace(code)))
	rec, err := r.scanReferral(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReferralRecord{}, ErrNotFound
	}
	if err != nil {
		return ReferralRecord{}, err
	}
	if !validateReferralScope(rec, dropID) {
		return ReferralRecord{}, ErrNotFound
	}
	return rec, nil
}

func (r *ReferralRepository) lookupForAttributionTx(ctx context.Context, tx pgx.Tx, sellerID, dropID, code string) (ReferralRecord, error) {
	row := tx.QueryRow(ctx, referralSelect+`
		WHERE rc.seller_id = $1 AND rc.code = $2
	`, sellerID, strings.ToUpper(strings.TrimSpace(code)))
	rec, err := r.scanReferral(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return ReferralRecord{}, ErrNotFound
	}
	if err != nil {
		return ReferralRecord{}, err
	}
	if !validateReferralScope(rec, dropID) {
		return ReferralRecord{}, ErrNotFound
	}
	return rec, nil
}

func (r *ReferralRepository) RecordClick(ctx context.Context, id string) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE referral_codes SET clicks_count = clicks_count + 1 WHERE id = $1
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *ReferralRepository) RecordSignup(ctx context.Context, sellerID, code string) error {
	row := r.store.pool.QueryRow(ctx, referralSelect+`
		WHERE rc.seller_id = $1 AND rc.code = $2
	`, sellerID, strings.ToUpper(strings.TrimSpace(code)))
	rec, err := r.scanReferral(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	_, err = r.store.pool.Exec(ctx, `
		UPDATE referral_codes SET signups_count = signups_count + 1 WHERE id = $1
	`, rec.ID)
	return err
}

func (r *ReferralRepository) RecordOrderPaidTx(ctx context.Context, tx pgx.Tx, referralCodeID string) error {
	_, err := tx.Exec(ctx, `
		UPDATE referral_codes SET orders_count = orders_count + 1 WHERE id = $1
	`, referralCodeID)
	return err
}

func (rec ReferralRecord) ToDomain() domain.ReferralCode {
	return domain.ReferralCode{
		ID:           rec.ID,
		Code:         rec.Code,
		DropID:       rec.DropID,
		DropTitle:    rec.DropTitle,
		DropSlug:     rec.DropSlug,
		ClicksCount:  rec.ClicksCount,
		SignupsCount: rec.SignupsCount,
		OrdersCount:  rec.OrdersCount,
		CreatedAt:    rec.CreatedAt.UTC().Format(time.RFC3339),
	}
}
