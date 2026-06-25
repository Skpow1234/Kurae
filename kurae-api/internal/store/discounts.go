package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

var ErrInvalidDiscount = errors.New("invalid discount code")
var ErrDiscountInUse = errors.New("discount code has been used and cannot be deleted")

type DiscountRepository struct {
	store *Store
}

func (s *Store) Discounts() *DiscountRepository {
	return &DiscountRepository{store: s}
}

type DiscountRecord struct {
	ID        string
	SellerID  string
	Code      string
	Type      domain.DiscountType
	Value     int
	MaxUses   *int
	UsesCount int
	ExpiresAt *time.Time
	DropID    *string
	DropTitle *string
	Active    bool
	CreatedAt time.Time
}

type CreateDiscountInput struct {
	SellerID  string
	Code      string
	Type      domain.DiscountType
	Value     int
	MaxUses   *int
	ExpiresAt *time.Time
	DropID    *string
}

const discountSelect = `
	SELECT dc.id, dc.seller_id, dc.code, dc.type, dc.value, dc.max_uses, dc.uses_count,
		dc.expires_at, dc.drop_id, d.title, dc.active, dc.created_at
	FROM discount_codes dc
	LEFT JOIN drops d ON d.id = dc.drop_id
`

func (r *DiscountRepository) scanDiscount(row pgx.Row) (DiscountRecord, error) {
	var rec DiscountRecord
	var dropTitle *string
	if err := row.Scan(
		&rec.ID, &rec.SellerID, &rec.Code, &rec.Type, &rec.Value, &rec.MaxUses, &rec.UsesCount,
		&rec.ExpiresAt, &rec.DropID, &dropTitle, &rec.Active, &rec.CreatedAt,
	); err != nil {
		return DiscountRecord{}, err
	}
	rec.DropTitle = dropTitle
	return rec, nil
}

func (r *DiscountRepository) ListBySeller(ctx context.Context, sellerID string) ([]DiscountRecord, error) {
	rows, err := r.store.pool.Query(ctx, discountSelect+`
		WHERE dc.seller_id = $1
		ORDER BY dc.created_at DESC
	`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []DiscountRecord
	for rows.Next() {
		rec, err := r.scanDiscount(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *DiscountRepository) Create(ctx context.Context, in CreateDiscountInput) (DiscountRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO discount_codes (seller_id, code, type, value, max_uses, expires_at, drop_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, in.SellerID, in.Code, in.Type, in.Value, in.MaxUses, in.ExpiresAt, in.DropID)

	var id string
	if err := row.Scan(&id); err != nil {
		if isUniqueViolation(err) {
			return DiscountRecord{}, ErrConflict
		}
		return DiscountRecord{}, err
	}
	return r.GetByIDForSeller(ctx, id, in.SellerID)
}

func (r *DiscountRepository) GetByIDForSeller(ctx context.Context, id, sellerID string) (DiscountRecord, error) {
	row := r.store.pool.QueryRow(ctx, discountSelect+` WHERE dc.id = $1 AND dc.seller_id = $2`, id, sellerID)
	rec, err := r.scanDiscount(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return DiscountRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *DiscountRepository) DeleteForSeller(ctx context.Context, id, sellerID string) error {
	var usesCount int
	err := r.store.pool.QueryRow(ctx, `
		SELECT uses_count FROM discount_codes WHERE id = $1 AND seller_id = $2
	`, id, sellerID).Scan(&usesCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if usesCount > 0 {
		return ErrDiscountInUse
	}

	tag, err := r.store.pool.Exec(ctx, `
		DELETE FROM discount_codes WHERE id = $1 AND seller_id = $2
	`, id, sellerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func ComputeDiscountCents(subtotal int, t domain.DiscountType, value int) int {
	if subtotal <= 0 {
		return 0
	}
	switch t {
	case domain.DiscountPercent:
		if value > 100 {
			value = 100
		}
		return subtotal * value / 100
	case domain.DiscountFixed:
		if value >= subtotal {
			return subtotal
		}
		return value
	default:
		return 0
	}
}

func validateDiscountRecord(rec DiscountRecord, dropID string, now time.Time) error {
	if !rec.Active {
		return ErrInvalidDiscount
	}
	if rec.ExpiresAt != nil && !rec.ExpiresAt.After(now) {
		return ErrInvalidDiscount
	}
	if rec.MaxUses != nil && rec.UsesCount >= *rec.MaxUses {
		return ErrInvalidDiscount
	}
	if rec.DropID != nil && *rec.DropID != dropID {
		return ErrInvalidDiscount
	}
	return nil
}

func (r *DiscountRepository) LookupForCheckout(ctx context.Context, sellerID, dropID, code string) (DiscountRecord, error) {
	row := r.store.pool.QueryRow(ctx, discountSelect+`
		WHERE dc.seller_id = $1 AND dc.code = $2
	`, sellerID, strings.ToUpper(strings.TrimSpace(code)))
	rec, err := r.scanDiscount(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return DiscountRecord{}, ErrInvalidDiscount
	}
	if err != nil {
		return DiscountRecord{}, err
	}
	if err := validateDiscountRecord(rec, dropID, time.Now()); err != nil {
		return DiscountRecord{}, err
	}
	return rec, nil
}

func (r *DiscountRepository) lookupForCheckoutTx(ctx context.Context, tx pgx.Tx, sellerID, dropID, code string) (DiscountRecord, error) {
	row := tx.QueryRow(ctx, discountSelect+`
		WHERE dc.seller_id = $1 AND dc.code = $2
		FOR UPDATE
	`, sellerID, strings.ToUpper(strings.TrimSpace(code)))
	rec, err := r.scanDiscount(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return DiscountRecord{}, ErrInvalidDiscount
	}
	if err != nil {
		return DiscountRecord{}, err
	}
	if err := validateDiscountRecord(rec, dropID, time.Now()); err != nil {
		return DiscountRecord{}, err
	}
	return rec, nil
}

func (r *DiscountRepository) incrementUseTx(ctx context.Context, tx pgx.Tx, id string) error {
	tag, err := tx.Exec(ctx, `
		UPDATE discount_codes
		SET uses_count = uses_count + 1
		WHERE id = $1
		  AND active = true
		  AND (max_uses IS NULL OR uses_count < max_uses)
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrInvalidDiscount
	}
	return nil
}

func (r *DiscountRepository) restoreUseTx(ctx context.Context, tx pgx.Tx, id string) error {
	_, err := tx.Exec(ctx, `
		UPDATE discount_codes
		SET uses_count = GREATEST(uses_count - 1, 0)
		WHERE id = $1
	`, id)
	return err
}

func (rec DiscountRecord) ToDomain() domain.DiscountCode {
	out := domain.DiscountCode{
		ID:        rec.ID,
		Code:      rec.Code,
		Type:      rec.Type,
		Value:     rec.Value,
		MaxUses:   rec.MaxUses,
		UsesCount: rec.UsesCount,
		DropID:    rec.DropID,
		DropTitle: rec.DropTitle,
		Active:    rec.Active,
		CreatedAt: rec.CreatedAt.UTC().Format(time.RFC3339),
	}
	if rec.ExpiresAt != nil {
		s := rec.ExpiresAt.UTC().Format(time.RFC3339)
		out.ExpiresAt = &s
	}
	return out
}
