package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type ProductRepository struct {
	store *Store
}

func (s *Store) Products() *ProductRepository {
	return &ProductRepository{store: s}
}

type ProductInput struct {
	ID               string
	Slug             string
	Name             string
	Description      string
	PriceCents       int
	ImageURL         string
	SortOrder        int
	InventoryTotal   int
	Sizes            []domain.DropSize
}

func (r *ProductRepository) scanProduct(row pgx.Row) (domain.DropProduct, error) {
	var p domain.DropProduct
	var sizesJSON []byte
	err := row.Scan(
		&p.ID, &p.Slug, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL,
		&p.SortOrder, &p.InventoryTotal, &p.InventoryRemaining, &sizesJSON,
	)
	if err != nil {
		return domain.DropProduct{}, err
	}
	if len(sizesJSON) > 0 {
		_ = json.Unmarshal(sizesJSON, &p.Sizes)
	}
	return p, nil
}

const productSelect = `
	SELECT id, slug, name, description, price_cents, image_url,
		sort_order, inventory_total, inventory_remaining, sizes
	FROM drop_products
`

func (r *ProductRepository) ListByDropID(ctx context.Context, dropID string) ([]domain.DropProduct, error) {
	rows, err := r.store.pool.Query(ctx, productSelect+`
		WHERE drop_id = $1
		ORDER BY sort_order ASC, created_at ASC
	`, dropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.DropProduct
	for rows.Next() {
		p, err := r.scanProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}

func (r *ProductRepository) GetByID(ctx context.Context, productID string) (domain.DropProduct, string, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT drop_id, id, slug, name, description, price_cents, image_url,
			sort_order, inventory_total, inventory_remaining, sizes
		FROM drop_products WHERE id = $1
	`, productID)
	var dropID string
	var p domain.DropProduct
	var sizesJSON []byte
	err := row.Scan(
		&dropID, &p.ID, &p.Slug, &p.Name, &p.Description, &p.PriceCents, &p.ImageURL,
		&p.SortOrder, &p.InventoryTotal, &p.InventoryRemaining, &sizesJSON,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DropProduct{}, "", ErrNotFound
	}
	if err != nil {
		return domain.DropProduct{}, "", err
	}
	if len(sizesJSON) > 0 {
		_ = json.Unmarshal(sizesJSON, &p.Sizes)
	}
	return p, dropID, nil
}

func (r *ProductRepository) GetByIDForDrop(ctx context.Context, productID, dropID string) (domain.DropProduct, error) {
	row := r.store.pool.QueryRow(ctx, productSelect+` WHERE id = $1 AND drop_id = $2`, productID, dropID)
	p, err := r.scanProduct(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.DropProduct{}, ErrNotFound
	}
	return p, err
}

func (r *ProductRepository) ReplaceForDrop(ctx context.Context, dropID, sellerID string, inputs []ProductInput) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	keepSlugs := make(map[string]struct{}, len(inputs))
	for _, in := range inputs {
		keepSlugs[in.Slug] = struct{}{}
	}

	rows, err := tx.Query(ctx, `SELECT slug FROM drop_products WHERE drop_id = $1`, dropID)
	if err != nil {
		return err
	}
	var existingSlugs []string
	for rows.Next() {
		var slug string
		if err := rows.Scan(&slug); err != nil {
			rows.Close()
			return err
		}
		existingSlugs = append(existingSlugs, slug)
	}
	rows.Close()

	for _, slug := range existingSlugs {
		if _, ok := keepSlugs[slug]; ok {
			continue
		}
		var orderCount int
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*)::int FROM orders o
			JOIN drop_products dp ON dp.id = o.product_id
			WHERE dp.drop_id = $1 AND dp.slug = $2
		`, dropID, slug).Scan(&orderCount); err != nil {
			return err
		}
		if orderCount > 0 {
			return ErrConflict
		}
		if _, err := tx.Exec(ctx, `DELETE FROM drop_products WHERE drop_id = $1 AND slug = $2`, dropID, slug); err != nil {
			return err
		}
	}

	for i, in := range inputs {
		sizes, _ := json.Marshal(in.Sizes)
		sortOrder := in.SortOrder
		if sortOrder == 0 {
			sortOrder = i
		}

		if in.ID != "" {
			existing, err := r.GetByIDForDrop(ctx, in.ID, dropID)
			if err != nil {
				return err
			}
			newRemaining, err := ReconcileInventoryRemaining(
				existing.InventoryTotal, existing.InventoryRemaining, in.InventoryTotal,
			)
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `
				UPDATE drop_products SET
					slug = $3, name = $4, description = $5, price_cents = $6, image_url = $7,
					sort_order = $8, inventory_total = $9, inventory_remaining = $10, sizes = $11,
					updated_at = now()
				WHERE id = $1 AND drop_id = $2
			`, in.ID, dropID, in.Slug, in.Name, in.Description, in.PriceCents, in.ImageURL,
				sortOrder, in.InventoryTotal, newRemaining, sizes)
			if err != nil {
				if isUniqueViolation(err) {
					return ErrConflict
				}
				return err
			}
			continue
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO drop_products (
				drop_id, seller_id, slug, name, description, price_cents, image_url,
				sort_order, inventory_total, inventory_remaining, sizes
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)
		`, dropID, sellerID, in.Slug, in.Name, in.Description, in.PriceCents, in.ImageURL,
			sortOrder, in.InventoryTotal, sizes)
		if err != nil {
			if isUniqueViolation(err) {
				return ErrConflict
			}
			return err
		}
	}

	if err := syncDropAggregatesTx(ctx, tx, dropID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ProductRepository) SyncDropAggregates(ctx context.Context, dropID string) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := syncDropAggregatesTx(ctx, tx, dropID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func syncDropAggregatesTx(ctx context.Context, tx pgx.Tx, dropID string) error {
	row := tx.QueryRow(ctx, `
		SELECT
			COALESCE(MIN(price_cents), 0),
			COALESCE(SUM(inventory_total), 0),
			COALESCE(SUM(inventory_remaining), 0)
		FROM drop_products
		WHERE drop_id = $1
	`, dropID)
	var minPrice, total, remaining int
	if err := row.Scan(&minPrice, &total, &remaining); err != nil {
		return err
	}

	var sizesJSON []byte
	_ = tx.QueryRow(ctx, `
		SELECT sizes FROM drop_products WHERE drop_id = $1 ORDER BY sort_order ASC, created_at ASC LIMIT 1
	`, dropID).Scan(&sizesJSON)

	_, err := tx.Exec(ctx, `
		UPDATE drops SET
			price_cents = $2,
			inventory_total = $3,
			inventory_remaining = $4,
			sizes = $5,
			updated_at = now()
		WHERE id = $1
	`, dropID, minPrice, total, remaining, sizesJSON)
	return err
}
