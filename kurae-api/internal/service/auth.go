package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrWeakPassword       = errors.New("weak password")
)

const minPasswordLength = 8

type AuthService struct {
	sellers   *store.SellerRepository
	buyers    *store.BuyerRepository
	team      *store.TeamRepository
	jwtSecret []byte
}

func NewAuthService(s *store.Store, jwtSecret string) *AuthService {
	return &AuthService{
		sellers:   s.Sellers(),
		buyers:    s.Buyers(),
		team:      s.Team(),
		jwtSecret: []byte(jwtSecret),
	}
}

type RegisterInput struct {
	Email    string
	Password string
	Name     string
	Slug     string
}

func (a *AuthService) Register(ctx context.Context, in RegisterInput) (domain.SellerSession, string, error) {
	if len(in.Password) < minPasswordLength {
		return domain.SellerSession{}, "", ErrWeakPassword
	}

	email, err := validate.NormalizeEmail(in.Email)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	slug := strings.TrimSpace(in.Slug)
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(in.Name), " ", "-"))
	}
	slug, err = validate.NormalizeSlug(slug)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	seller, err := a.sellers.Create(ctx, email, string(hash), validate.Trim(in.Name), slug)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := sellerSession(seller)
	token, err := a.issueOwnerToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

type BuyerRegisterInput struct {
	Email    string
	Password string
	Name     string
}

func (a *AuthService) RegisterBuyer(ctx context.Context, in BuyerRegisterInput) (domain.BuyerSession, string, error) {
	if len(in.Password) < minPasswordLength {
		return domain.BuyerSession{}, "", ErrWeakPassword
	}

	email, err := validate.NormalizeEmail(in.Email)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}

	name := validate.Trim(in.Name)
	if name == "" {
		name = strings.Split(email, "@")[0]
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}

	buyer, err := a.buyers.Create(ctx, email, string(hash), name)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}

	session := buyerSession(buyer)
	token, err := a.issueBuyerToken(buyer)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) LoginBuyer(ctx context.Context, email, password string) (domain.BuyerSession, string, error) {
	normalized, err := validate.NormalizeEmail(email)
	if err != nil {
		return domain.BuyerSession{}, "", ErrInvalidCredentials
	}
	buyer, err := a.buyers.GetByEmail(ctx, normalized)
	if errors.Is(err, store.ErrNotFound) {
		return domain.BuyerSession{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return domain.BuyerSession{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(buyer.PasswordHash), []byte(password)); err != nil {
		return domain.BuyerSession{}, "", ErrInvalidCredentials
	}

	session := buyerSession(buyer)
	token, err := a.issueBuyerToken(buyer)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) GetBuyerSession(ctx context.Context, buyerID string) (domain.BuyerSession, error) {
	buyer, err := a.buyers.GetByID(ctx, buyerID)
	if err != nil {
		return domain.BuyerSession{}, err
	}
	return buyerSession(buyer), nil
}

func (a *AuthService) UpdateBuyerProfile(ctx context.Context, buyerID, name string) (domain.BuyerSession, string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return domain.BuyerSession{}, "", errors.New("name is required")
	}

	buyer, err := a.buyers.UpdateName(ctx, buyerID, name)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}

	session := buyerSession(buyer)
	token, err := a.issueBuyerToken(buyer)
	if err != nil {
		return domain.BuyerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) ChangeBuyerPassword(ctx context.Context, buyerID, currentPassword, newPassword string) error {
	if len(newPassword) < minPasswordLength {
		return ErrWeakPassword
	}

	buyer, err := a.buyers.GetByID(ctx, buyerID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(buyer.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return a.buyers.UpdatePasswordHash(ctx, buyerID, string(hash))
}

func (a *AuthService) Login(ctx context.Context, email, password string) (domain.SellerSession, string, error) {
	normalized, err := validate.NormalizeEmail(email)
	if err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}
	seller, err := a.sellers.GetByEmail(ctx, normalized)
	if errors.Is(err, store.ErrNotFound) {
		return a.loginTeamMember(ctx, normalized, password)
	}
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(seller.PasswordHash), []byte(password)); err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}

	session := sellerSession(seller)
	token, err := a.issueOwnerToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) loginTeamMember(
	ctx context.Context,
	email, password string,
) (domain.SellerSession, string, error) {
	member, err := a.team.GetByEmail(ctx, email)
	if errors.Is(err, store.ErrNotFound) {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(member.PasswordHash), []byte(password)); err != nil {
		return domain.SellerSession{}, "", ErrInvalidCredentials
	}

	seller, err := a.sellers.GetByID(ctx, member.SellerID)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := teamMemberSession(seller, member)
	token, err := a.issueTeamMemberToken(seller, member)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) GetSession(ctx context.Context, claims AuthClaims) (domain.SellerSession, error) {
	seller, err := a.sellers.GetByID(ctx, claims.SellerID)
	if err != nil {
		return domain.SellerSession{}, err
	}
	if claims.TeamMemberID != "" {
		member, err := a.team.GetByIDForSeller(ctx, claims.TeamMemberID, claims.SellerID)
		if err != nil {
			return domain.SellerSession{}, err
		}
		return teamMemberSession(seller, member), nil
	}
	return sellerSession(seller), nil
}

func (a *AuthService) GetSessionBySellerID(ctx context.Context, sellerID string) (domain.SellerSession, error) {
	seller, err := a.sellers.GetByID(ctx, sellerID)
	if err != nil {
		return domain.SellerSession{}, err
	}
	return sellerSession(seller), nil
}

func (a *AuthService) UpdateProfile(ctx context.Context, claims AuthClaims, name string) (domain.SellerSession, string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return domain.SellerSession{}, "", errors.New("name is required")
	}

	if claims.TeamMemberID != "" {
		member, err := a.team.UpdateName(ctx, claims.TeamMemberID, name)
		if err != nil {
			return domain.SellerSession{}, "", err
		}
		seller, err := a.sellers.GetByID(ctx, claims.SellerID)
		if err != nil {
			return domain.SellerSession{}, "", err
		}
		session := teamMemberSession(seller, member)
		token, err := a.issueTeamMemberToken(seller, member)
		if err != nil {
			return domain.SellerSession{}, "", err
		}
		return session, token, nil
	}

	if !claims.Allows(domain.PermSettingsBrand) {
		return domain.SellerSession{}, "", ErrUnauthorized
	}

	seller, err := a.sellers.UpdateName(ctx, claims.SellerID, name)
	if err != nil {
		return domain.SellerSession{}, "", err
	}

	session := sellerSession(seller)
	token, err := a.issueOwnerToken(seller)
	if err != nil {
		return domain.SellerSession{}, "", err
	}
	return session, token, nil
}

func (a *AuthService) ChangePassword(ctx context.Context, claims AuthClaims, currentPassword, newPassword string) error {
	if len(newPassword) < minPasswordLength {
		return ErrWeakPassword
	}

	if claims.TeamMemberID != "" {
		member, err := a.team.GetByIDForSeller(ctx, claims.TeamMemberID, claims.SellerID)
		if err != nil {
			return err
		}
		if err := bcrypt.CompareHashAndPassword([]byte(member.PasswordHash), []byte(currentPassword)); err != nil {
			return ErrInvalidCredentials
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		return a.team.UpdatePasswordHash(ctx, member.ID, string(hash))
	}

	seller, err := a.sellers.GetByID(ctx, claims.SellerID)
	if err != nil {
		return err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(seller.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	return a.sellers.UpdatePasswordHash(ctx, claims.SellerID, string(hash))
}

func sellerSession(seller domain.Seller) domain.SellerSession {
	return domain.SellerSession{
		Role:       "seller",
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
		TeamRole:   string(domain.TeamRoleOwner),
	}
}

func teamMemberSession(seller domain.Seller, member store.TeamMemberRecord) domain.SellerSession {
	return domain.SellerSession{
		Role:       "seller",
		Email:      member.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
		TeamRole:   string(member.Role),
		MemberName: member.Name,
	}
}

func buyerSession(buyer domain.Buyer) domain.BuyerSession {
	return domain.BuyerSession{
		Role:  "buyer",
		Email: buyer.Email,
		Name:  buyer.Name,
	}
}

type AuthClaims struct {
	Role         string `json:"role"`
	SellerID     string `json:"sellerId,omitempty"`
	TeamMemberID string `json:"teamMemberId,omitempty"`
	TeamRole     string `json:"teamRole,omitempty"`
	BuyerID      string `json:"buyerId,omitempty"`
	Email        string `json:"email"`
	SellerSlug   string `json:"sellerSlug,omitempty"`
	SellerName   string `json:"sellerName,omitempty"`
	MemberName   string `json:"memberName,omitempty"`
	BuyerName    string `json:"buyerName,omitempty"`
	jwt.RegisteredClaims
}

func (c AuthClaims) EffectiveTeamRole() domain.TeamRole {
	if c.TeamMemberID == "" {
		return domain.TeamRoleOwner
	}
	if role, ok := domain.ParseTeamRole(c.TeamRole); ok {
		return role
	}
	return domain.TeamRoleStaff
}

func (c AuthClaims) Allows(perm domain.Permission) bool {
	return domain.RoleAllows(c.EffectiveTeamRole(), perm)
}

func (c AuthClaims) IsSeller() bool {
	if c.Role == "seller" {
		return true
	}
	return c.Role == "" && c.SellerID != ""
}

func (c AuthClaims) IsBuyer() bool {
	if c.Role == "buyer" {
		return true
	}
	return false
}

func (a *AuthService) ParseToken(tokenStr string) (AuthClaims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &AuthClaims{}, func(t *jwt.Token) (any, error) {
		return a.jwtSecret, nil
	})
	if err != nil {
		return AuthClaims{}, ErrUnauthorized
	}
	c, ok := token.Claims.(*AuthClaims)
	if !ok || !token.Valid {
		return AuthClaims{}, ErrUnauthorized
	}
	return *c, nil
}

func (a *AuthService) issueOwnerToken(seller domain.Seller) (string, error) {
	c := AuthClaims{
		Role:       "seller",
		SellerID:   seller.ID,
		TeamRole:   string(domain.TeamRoleOwner),
		Email:      seller.Email,
		SellerSlug: seller.Slug,
		SellerName: seller.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(a.jwtSecret)
}

func (a *AuthService) issueTeamMemberToken(seller domain.Seller, member store.TeamMemberRecord) (string, error) {
	c := AuthClaims{
		Role:         "seller",
		SellerID:     seller.ID,
		TeamMemberID: member.ID,
		TeamRole:     string(member.Role),
		Email:        member.Email,
		SellerSlug:   seller.Slug,
		SellerName:   seller.Name,
		MemberName:   member.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(a.jwtSecret)
}

func (a *AuthService) issueBuyerToken(buyer domain.Buyer) (string, error) {
	c := AuthClaims{
		Role:      "buyer",
		BuyerID:   buyer.ID,
		Email:     buyer.Email,
		BuyerName: buyer.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, c)
	return token.SignedString(a.jwtSecret)
}
