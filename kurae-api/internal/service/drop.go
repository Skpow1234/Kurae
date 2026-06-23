package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

type DropService struct {
	drops *store.DropRepository
}

func NewDropService(s *store.Store) *DropService {
	return &DropService{drops: s.Drops()}
}

type CreateDropRequest struct {
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

func (d *DropService) Create(ctx context.Context, req CreateDropRequest) (domain.SellerDrop, error) {
	if req.InventoryTotal < 0 || req.PriceCents < 0 {
		return domain.SellerDrop{}, errors.New("invalid inventory or price")
	}
	if !req.EndsAt.After(req.StartsAt) {
		return domain.SellerDrop{}, errors.New("ends_at must be after starts_at")
	}
	if len(req.Sizes) == 0 {
		req.Sizes = defaultSizes()
	}

	record, err := d.drops.Create(ctx, store.CreateDropInput{
		SellerID:         req.SellerID,
		Slug:             strings.TrimSpace(req.Slug),
		Title:            strings.TrimSpace(req.Title),
		Description:      req.Description,
		Story:            req.Story,
		PromoMessage:     req.PromoMessage,
		PriceCents:       req.PriceCents,
		Currency:         "USD",
		HeroImageURL:     req.HeroImageURL,
		GalleryImageURLs: req.GalleryImageURLs,
		InventoryTotal:   req.InventoryTotal,
		Sizes:            req.Sizes,
		StartsAt:         req.StartsAt,
		EndsAt:           req.EndsAt,
		PublishStatus:    req.PublishStatus,
	})
	if err != nil {
		return domain.SellerDrop{}, err
	}
	return record.ToSellerDrop(time.Now()), nil
}

func (d *DropService) Update(ctx context.Context, req CreateDropRequest, dropID string) (domain.SellerDrop, error) {
	if !req.EndsAt.After(req.StartsAt) {
		return domain.SellerDrop{}, errors.New("ends_at must be after starts_at")
	}
	if len(req.Sizes) == 0 {
		req.Sizes = defaultSizes()
	}

	record, err := d.drops.Update(ctx, store.UpdateDropInput{
		ID:               dropID,
		SellerID:         req.SellerID,
		Slug:             strings.TrimSpace(req.Slug),
		Title:            strings.TrimSpace(req.Title),
		Description:      req.Description,
		Story:            req.Story,
		PromoMessage:     req.PromoMessage,
		PriceCents:       req.PriceCents,
		HeroImageURL:     req.HeroImageURL,
		GalleryImageURLs: req.GalleryImageURLs,
		InventoryTotal:   req.InventoryTotal,
		Sizes:            req.Sizes,
		StartsAt:         req.StartsAt,
		EndsAt:           req.EndsAt,
		PublishStatus:    req.PublishStatus,
	})
	if err != nil {
		return domain.SellerDrop{}, err
	}
	return record.ToSellerDrop(time.Now()), nil
}

func (d *DropService) Get(ctx context.Context, sellerID, dropID string) (domain.SellerDrop, error) {
	record, err := d.drops.GetByIDForSeller(ctx, dropID, sellerID)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	return record.ToSellerDrop(time.Now()), nil
}

func (d *DropService) List(ctx context.Context, sellerID string) ([]domain.SellerDrop, error) {
	records, err := d.drops.ListBySellerID(ctx, sellerID)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	out := make([]domain.SellerDrop, len(records))
	for i, r := range records {
		out[i] = r.ToSellerDrop(now)
	}
	return out, nil
}

func (d *DropService) GetPublic(ctx context.Context, sellerSlug, dropSlug string, allowDraft bool) (domain.PublicDrop, error) {
	record, err := d.drops.GetBySellerAndSlug(ctx, sellerSlug, dropSlug)
	if errors.Is(err, store.ErrNotFound) {
		return domain.PublicDrop{}, err
	}
	if err != nil {
		return domain.PublicDrop{}, err
	}
	if record.PublishStatus != domain.PublishPublished && !allowDraft {
		return domain.PublicDrop{}, store.ErrNotFound
	}
	return record.ToPublicDrop(time.Now()), nil
}

func defaultSizes() []domain.DropSize {
	return []domain.DropSize{
		{ID: "s", Label: "S", Available: true},
		{ID: "m", Label: "M", Available: true},
		{ID: "l", Label: "L", Available: true},
		{ID: "xl", Label: "XL", Available: true},
	}
}
