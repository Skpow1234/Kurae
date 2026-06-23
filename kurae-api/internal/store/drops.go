package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type DropRepository struct {
	store *Store
}

func (s *Store) Drops() *DropRepository {
	return &DropRepository{store: s}
}

type CreateDropInput struct {
	SellerID           string
	Slug               string
	Title              string
	Description        string
	Story              string
	PromoMessage       *string
	PriceCents         int
	Currency           string
	HeroImageURL       string
	GalleryImageURLs   []string
	InventoryTotal     int
	Sizes              []domain.DropSize
	StartsAt           time.Time
	EndsAt             time.Time
	PublishStatus      domain.PublishStatus
}

type UpdateDropInput struct {
	ID               string
	SellerID         string
	Slug             string
	Title            string
	Description      string
	Story            string
	PromoMessage     *string
	PriceCents       int
	HeroImageURL     string
	GalleryImageURLs []string
	InventoryTotal   int
	Sizes            []domain.DropSize
	StartsAt         time.Time
	EndsAt           time.Time
	PublishStatus    domain.PublishStatus
}

func (r *DropRepository) scanDrop(row pgx.Row) (domain.DropRecord, error) {
	var d domain.DropRecord
	var galleryJSON, sizesJSON []byte
	var promo *string

	err := row.Scan(
		&d.ID, &d.SellerID, &d.SellerSlug, &d.SellerName, &d.Slug, &d.Title,
		&d.Description, &d.Story, &promo, &d.PriceCents, &d.Currency,
		&d.HeroImageURL, &galleryJSON, &d.InventoryTotal, &d.InventoryRemaining,
		&d.WaitlistCount, &sizesJSON, &d.StartsAt, &d.EndsAt, &d.PublishStatus,
		&d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return domain.DropRecord{}, err
	}
	d.PromoMessage = promo
	if len(galleryJSON) > 0 {
		_ = json.Unmarshal(galleryJSON, &d.GalleryImageURLs)
	}
	if len(sizesJSON) > 0 {
		_ = json.Unmarshal(sizesJSON, &d.Sizes)
	}
	return d, nil
}

const dropSelect = `
	SELECT d.id, d.seller_id, s.slug, s.name, d.slug, d.title,
		d.description, d.story, d.promo_message, d.price_cents, d.currency,
		d.hero_image_url, d.gallery_image_urls, d.inventory_total, d.inventory_remaining,
		d.waitlist_count, d.sizes, d.starts_at, d.ends_at, d.publish_status,
		d.created_at, d.updated_at
	FROM drops d
	JOIN sellers s ON s.id = d.seller_id
`

func (r *DropRepository) Create(ctx context.Context, in CreateDropInput) (domain.DropRecord, error) {
	gallery, _ := json.Marshal(in.GalleryImageURLs)
	sizes, _ := json.Marshal(in.Sizes)
	if in.Currency == "" {
		in.Currency = "USD"
	}

	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO drops (
			seller_id, slug, title, description, story, promo_message,
			price_cents, currency, hero_image_url, gallery_image_urls,
			inventory_total, inventory_remaining, sizes, starts_at, ends_at, publish_status
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14,$15)
		RETURNING id
	`, in.SellerID, in.Slug, in.Title, in.Description, in.Story, in.PromoMessage,
		in.PriceCents, in.Currency, in.HeroImageURL, gallery,
		in.InventoryTotal, sizes, in.StartsAt, in.EndsAt, in.PublishStatus)

	var id string
	if err := row.Scan(&id); err != nil {
		if isUniqueViolation(err) {
			return domain.DropRecord{}, ErrConflict
		}
		return domain.DropRecord{}, err
	}
	return r.GetByIDForSeller(ctx, id, in.SellerID)
}

func (r *DropRepository) GetByID(ctx context.Context, id string) (domain.DropRecord, error) {
	row := r.store.pool.QueryRow(ctx, dropSelect+` WHERE d.id = $1`, id)
	d, err := r.scanDrop(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DropRecord{}, ErrNotFound
	}
	return d, err
}

func (r *DropRepository) GetByIDForSeller(ctx context.Context, id, sellerID string) (domain.DropRecord, error) {
	row := r.store.pool.QueryRow(ctx, dropSelect+` WHERE d.id = $1 AND d.seller_id = $2`, id, sellerID)
	d, err := r.scanDrop(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DropRecord{}, ErrNotFound
	}
	return d, err
}

func (r *DropRepository) GetBySellerAndSlug(ctx context.Context, sellerSlug, dropSlug string) (domain.DropRecord, error) {
	row := r.store.pool.QueryRow(ctx, dropSelect+` WHERE s.slug = $1 AND d.slug = $2`, sellerSlug, dropSlug)
	d, err := r.scanDrop(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DropRecord{}, ErrNotFound
	}
	return d, err
}

func (r *DropRepository) ListBySellerID(ctx context.Context, sellerID string) ([]domain.DropRecord, error) {
	rows, err := r.store.pool.Query(ctx, dropSelect+` WHERE d.seller_id = $1 ORDER BY d.created_at DESC`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drops []domain.DropRecord
	for rows.Next() {
		d, err := r.scanDrop(rows)
		if err != nil {
			return nil, err
		}
		drops = append(drops, d)
	}
	return drops, rows.Err()
}

func (r *DropRepository) Update(ctx context.Context, in UpdateDropInput) (domain.DropRecord, error) {
	gallery, _ := json.Marshal(in.GalleryImageURLs)
	sizes, _ := json.Marshal(in.Sizes)

	tag, err := r.store.pool.Exec(ctx, `
		UPDATE drops SET
			slug = $3, title = $4, description = $5, story = $6, promo_message = $7,
			price_cents = $8, hero_image_url = $9, gallery_image_urls = $10,
			inventory_total = $11, sizes = $12, starts_at = $13, ends_at = $14,
			publish_status = $15, updated_at = now()
		WHERE id = $1 AND seller_id = $2
	`, in.ID, in.SellerID, in.Slug, in.Title, in.Description, in.Story, in.PromoMessage,
		in.PriceCents, in.HeroImageURL, gallery, in.InventoryTotal, sizes,
		in.StartsAt, in.EndsAt, in.PublishStatus)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.DropRecord{}, ErrConflict
		}
		return domain.DropRecord{}, err
	}
	if tag.RowsAffected() == 0 {
		return domain.DropRecord{}, ErrNotFound
	}
	return r.GetByIDForSeller(ctx, in.ID, in.SellerID)
}

func (r *DropRepository) IncrementWaitlistCount(ctx context.Context, dropID string) error {
	_, err := r.store.pool.Exec(ctx, `
		UPDATE drops SET waitlist_count = waitlist_count + 1, updated_at = now()
		WHERE id = $1
	`, dropID)
	return err
}

func isUniqueViolation(err error) bool {
	return err != nil && (errors.Is(err, pgx.ErrNoRows) == false) &&
		(contains(err.Error(), "duplicate key") || contains(err.Error(), "unique constraint"))
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		(len(s) > 0 && searchSubstring(s, sub)))
}

func searchSubstring(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
