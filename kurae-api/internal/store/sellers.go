package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

var ErrNotFound = errors.New("not found")
var ErrConflict = errors.New("conflict")

type SellerRepository struct {
	store *Store
}

func (s *Store) Sellers() *SellerRepository {
	return &SellerRepository{store: s}
}

func (r *SellerRepository) Create(ctx context.Context, email, passwordHash, name, slug string) (domain.Seller, error) {
	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO sellers (email, password_hash, name, slug)
		VALUES ($1, $2, $3, $4)
		RETURNING id, email, password_hash, name, slug, created_at
	`, strings.ToLower(email), passwordHash, name, slug)

	var seller domain.Seller
	if err := row.Scan(&seller.ID, &seller.Email, &seller.PasswordHash, &seller.Name, &seller.Slug, &seller.CreatedAt); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.Seller{}, ErrConflict
		}
		return domain.Seller{}, err
	}
	return seller, nil
}

func (r *SellerRepository) GetByEmail(ctx context.Context, email string) (domain.Seller, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, slug, created_at
		FROM sellers WHERE email = $1
	`, strings.ToLower(email))

	var seller domain.Seller
	if err := row.Scan(&seller.ID, &seller.Email, &seller.PasswordHash, &seller.Name, &seller.Slug, &seller.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Seller{}, ErrNotFound
		}
		return domain.Seller{}, err
	}
	return seller, nil
}

func (r *SellerRepository) GetByID(ctx context.Context, id string) (domain.Seller, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, slug, created_at
		FROM sellers WHERE id = $1
	`, id)

	var seller domain.Seller
	if err := row.Scan(&seller.ID, &seller.Email, &seller.PasswordHash, &seller.Name, &seller.Slug, &seller.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Seller{}, ErrNotFound
		}
		return domain.Seller{}, err
	}
	return seller, nil
}

func (r *SellerRepository) GetBySlug(ctx context.Context, slug string) (domain.Seller, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, slug, created_at
		FROM sellers WHERE slug = $1
	`, slug)

	var seller domain.Seller
	if err := row.Scan(&seller.ID, &seller.Email, &seller.PasswordHash, &seller.Name, &seller.Slug, &seller.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Seller{}, ErrNotFound
		}
		return domain.Seller{}, err
	}
	return seller, nil
}

func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = strings.ReplaceAll(s, " ", "-")
	return s
}

func UniqueSlug(ctx context.Context, tx pgx.Tx, base string) (string, error) {
	candidate := slugify(base)
	for i := 0; i < 100; i++ {
		var exists bool
		slug := candidate
		if i > 0 {
			slug = fmt.Sprintf("%s-%d", candidate, i)
		}
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM sellers WHERE slug = $1)`, slug).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return slug, nil
		}
	}
	return "", fmt.Errorf("could not generate unique slug")
}
