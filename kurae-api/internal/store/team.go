package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type TeamRepository struct {
	store *Store
}

func (s *Store) Team() *TeamRepository {
	return &TeamRepository{store: s}
}

type TeamMemberRecord struct {
	ID           string
	SellerID     string
	Email        string
	PasswordHash string
	Name         string
	Role         domain.TeamRole
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (r *TeamRepository) ListBySeller(ctx context.Context, sellerID string) ([]TeamMemberRecord, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, seller_id, email, password_hash, name, role, created_at, updated_at
		FROM seller_team_members
		WHERE seller_id = $1
		ORDER BY created_at ASC
	`, sellerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []TeamMemberRecord
	for rows.Next() {
		rec, err := scanTeamMember(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, rows.Err()
}

func (r *TeamRepository) GetByIDForSeller(ctx context.Context, id, sellerID string) (TeamMemberRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, seller_id, email, password_hash, name, role, created_at, updated_at
		FROM seller_team_members
		WHERE id = $1 AND seller_id = $2
	`, id, sellerID)
	rec, err := scanTeamMember(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return TeamMemberRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *TeamRepository) GetByEmail(ctx context.Context, email string) (TeamMemberRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		SELECT id, seller_id, email, password_hash, name, role, created_at, updated_at
		FROM seller_team_members
		WHERE email = $1
	`, email)
	rec, err := scanTeamMember(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return TeamMemberRecord{}, ErrNotFound
	}
	return rec, err
}

type CreateTeamMemberInput struct {
	SellerID     string
	Email        string
	PasswordHash string
	Name         string
	Role         domain.TeamRole
}

func (r *TeamRepository) Create(ctx context.Context, in CreateTeamMemberInput) (TeamMemberRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		INSERT INTO seller_team_members (seller_id, email, password_hash, name, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, seller_id, email, password_hash, name, role, created_at, updated_at
	`, in.SellerID, in.Email, in.PasswordHash, in.Name, in.Role)
	rec, err := scanTeamMember(row)
	if isUniqueViolation(err) {
		return TeamMemberRecord{}, ErrConflict
	}
	return rec, err
}

func (r *TeamRepository) Update(ctx context.Context, id, sellerID, name string, role domain.TeamRole) (TeamMemberRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		UPDATE seller_team_members
		SET name = $3, role = $4, updated_at = now()
		WHERE id = $1 AND seller_id = $2
		RETURNING id, seller_id, email, password_hash, name, role, created_at, updated_at
	`, id, sellerID, name, role)
	rec, err := scanTeamMember(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return TeamMemberRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *TeamRepository) Delete(ctx context.Context, id, sellerID string) error {
	tag, err := r.store.pool.Exec(ctx, `
		DELETE FROM seller_team_members WHERE id = $1 AND seller_id = $2
	`, id, sellerID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *TeamRepository) UpdateName(ctx context.Context, id, name string) (TeamMemberRecord, error) {
	row := r.store.pool.QueryRow(ctx, `
		UPDATE seller_team_members
		SET name = $2, updated_at = now()
		WHERE id = $1
		RETURNING id, seller_id, email, password_hash, name, role, created_at, updated_at
	`, id, name)
	rec, err := scanTeamMember(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return TeamMemberRecord{}, ErrNotFound
	}
	return rec, err
}

func (r *TeamRepository) UpdatePasswordHash(ctx context.Context, id, hash string) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE seller_team_members SET password_hash = $2, updated_at = now() WHERE id = $1
	`, id, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanTeamMember(row pgx.Row) (TeamMemberRecord, error) {
	var rec TeamMemberRecord
	err := row.Scan(
		&rec.ID, &rec.SellerID, &rec.Email, &rec.PasswordHash,
		&rec.Name, &rec.Role, &rec.CreatedAt, &rec.UpdatedAt,
	)
	return rec, err
}

func (rec TeamMemberRecord) ToDomain() domain.TeamMember {
	return domain.TeamMember{
		ID:        rec.ID,
		Email:     rec.Email,
		Name:      rec.Name,
		Role:      rec.Role,
		CreatedAt: rec.CreatedAt.UTC().Format(time.RFC3339),
	}
}
