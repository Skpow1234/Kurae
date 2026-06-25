package store

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type BuyerRepository struct {
	store *Store
}

func (s *Store) Buyers() *BuyerRepository {
	return &BuyerRepository{store: s}
}

func (r *BuyerRepository) Create(ctx context.Context, email, passwordHash, name string) (domain.Buyer, error) {
	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO buyers (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, name, created_at
	`, strings.ToLower(email), passwordHash, name)

	var buyer domain.Buyer
	if err := row.Scan(&buyer.ID, &buyer.Email, &buyer.PasswordHash, &buyer.Name, &buyer.CreatedAt); err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			return domain.Buyer{}, ErrConflict
		}
		return domain.Buyer{}, err
	}
	return buyer, nil
}

func (r *BuyerRepository) GetByEmail(ctx context.Context, email string) (domain.Buyer, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, created_at
		FROM buyers WHERE email = $1
	`, strings.ToLower(email))

	var buyer domain.Buyer
	if err := row.Scan(&buyer.ID, &buyer.Email, &buyer.PasswordHash, &buyer.Name, &buyer.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Buyer{}, ErrNotFound
		}
		return domain.Buyer{}, err
	}
	return buyer, nil
}

func (r *BuyerRepository) GetByID(ctx context.Context, id string) (domain.Buyer, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, created_at
		FROM buyers WHERE id = $1
	`, id)

	var buyer domain.Buyer
	if err := row.Scan(&buyer.ID, &buyer.Email, &buyer.PasswordHash, &buyer.Name, &buyer.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Buyer{}, ErrNotFound
		}
		return domain.Buyer{}, err
	}
	return buyer, nil
}

func (r *BuyerRepository) UpdateName(ctx context.Context, buyerID, name string) (domain.Buyer, error) {
	row := r.store.pool.QueryRow(ctx, `
		UPDATE buyers SET name = $2
		WHERE id = $1
		RETURNING id, email, password_hash, name, created_at
	`, buyerID, name)

	var buyer domain.Buyer
	if err := row.Scan(&buyer.ID, &buyer.Email, &buyer.PasswordHash, &buyer.Name, &buyer.CreatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Buyer{}, ErrNotFound
		}
		return domain.Buyer{}, err
	}
	return buyer, nil
}

func (r *BuyerRepository) UpdatePasswordHash(ctx context.Context, buyerID, passwordHash string) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE buyers SET password_hash = $2
		WHERE id = $1
	`, buyerID, passwordHash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
