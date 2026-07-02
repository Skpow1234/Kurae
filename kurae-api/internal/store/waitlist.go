package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type WaitlistRepository struct {
	store *Store
}

func (s *Store) Waitlist() *WaitlistRepository {
	return &WaitlistRepository{store: s}
}

func (r *WaitlistRepository) Join(ctx context.Context, dropID, email string) (bool, error) {
	tag, err := r.store.pool.Exec(ctx, `
		INSERT INTO waitlist_entries (drop_id, email)
		VALUES ($1, $2)
		ON CONFLICT (drop_id, email) DO NOTHING
	`, dropID, email)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *WaitlistRepository) CountByDrop(ctx context.Context, dropID string) (int, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM waitlist_entries WHERE drop_id = $1
	`, dropID)
	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}
	return count, nil
}

func (r *WaitlistRepository) ListEmailsByDrop(ctx context.Context, dropID string) ([]string, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT email FROM waitlist_entries WHERE drop_id = $1 ORDER BY created_at ASC
	`, dropID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var emails []string
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err != nil {
			return nil, err
		}
		emails = append(emails, email)
	}
	return emails, rows.Err()
}

func (r *WaitlistRepository) Exists(ctx context.Context, dropID string) (bool, error) {
	row := r.store.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM drops WHERE id = $1)`, dropID)
	var exists bool
	if err := row.Scan(&exists); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, err
	}
	return exists, nil
}
