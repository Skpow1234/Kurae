package service

import (
	"context"
	"errors"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
	"golang.org/x/crypto/bcrypt"
)

var ErrInvalidTeamRole = errors.New("invalid team role")
var ErrTeamEmailInUse = errors.New("email already in use")

type TeamService struct {
	team    *store.TeamRepository
	sellers *store.SellerRepository
}

func NewTeamService(s *store.Store) *TeamService {
	return &TeamService{
		team:    s.Team(),
		sellers: s.Sellers(),
	}
}

type CreateTeamMemberRequest struct {
	SellerID string
	Email    string
	Name     string
	Password string
	Role     domain.TeamRole
}

type UpdateTeamMemberRequest struct {
	SellerID string
	MemberID string
	Name     string
	Role     domain.TeamRole
}

func (t *TeamService) List(ctx context.Context, sellerID string) ([]domain.TeamMember, error) {
	records, err := t.team.ListBySeller(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.TeamMember, len(records))
	for i, rec := range records {
		out[i] = rec.ToDomain()
	}
	return out, nil
}

func (t *TeamService) Create(ctx context.Context, req CreateTeamMemberRequest) (domain.TeamMember, error) {
	if req.Role != domain.TeamRoleAdmin && req.Role != domain.TeamRoleStaff {
		return domain.TeamMember{}, ErrInvalidTeamRole
	}
	if len(req.Password) < minPasswordLength {
		return domain.TeamMember{}, ErrWeakPassword
	}

	email, err := validate.NormalizeEmail(req.Email)
	if err != nil {
		return domain.TeamMember{}, err
	}
	name := validate.Trim(req.Name)
	if name == "" {
		return domain.TeamMember{}, errors.New("name is required")
	}

	if _, err := t.sellers.GetByEmail(ctx, email); err == nil {
		return domain.TeamMember{}, ErrTeamEmailInUse
	} else if !errors.Is(err, store.ErrNotFound) {
		return domain.TeamMember{}, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.TeamMember{}, err
	}

	rec, err := t.team.Create(ctx, store.CreateTeamMemberInput{
		SellerID:     req.SellerID,
		Email:        email,
		PasswordHash: string(hash),
		Name:         name,
		Role:         req.Role,
	})
	if err != nil {
		return domain.TeamMember{}, err
	}
	return rec.ToDomain(), nil
}

func (t *TeamService) Update(ctx context.Context, req UpdateTeamMemberRequest) (domain.TeamMember, error) {
	if req.Role != domain.TeamRoleAdmin && req.Role != domain.TeamRoleStaff {
		return domain.TeamMember{}, ErrInvalidTeamRole
	}
	name := validate.Trim(req.Name)
	if name == "" {
		return domain.TeamMember{}, errors.New("name is required")
	}

	rec, err := t.team.Update(ctx, req.MemberID, req.SellerID, name, req.Role)
	if err != nil {
		return domain.TeamMember{}, err
	}
	return rec.ToDomain(), nil
}

func (t *TeamService) Delete(ctx context.Context, sellerID, memberID string) error {
	return t.team.Delete(ctx, memberID, sellerID)
}
