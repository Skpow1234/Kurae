package service

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
)

type DropService struct {
	drops           *store.DropRepository
	products        *store.ProductRepository
	notify          *WaitlistNotifyService
	inventoryAlerts *InventoryAlertService
}

func NewDropService(
	s *store.Store,
	notify *WaitlistNotifyService,
	inventoryAlerts *InventoryAlertService,
) *DropService {
	return &DropService{
		drops:           s.Drops(),
		products:        s.Products(),
		notify:          notify,
		inventoryAlerts: inventoryAlerts,
	}
}

type DropProductInput struct {
	ID             string
	Slug           string
	Name           string
	Description    string
	PriceCents     int
	ImageURL       string
	SortOrder      int
	InventoryTotal int
	Sizes          []domain.DropSize
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
	Products         []DropProductInput
	StartsAt         time.Time
	EndsAt           time.Time
	PublishStatus    domain.PublishStatus
}

func normalizePublishStatus(status domain.PublishStatus, startsAt, now time.Time) domain.PublishStatus {
	switch status {
	case domain.PublishPublished:
		return domain.PublishPublished
	case domain.PublishScheduled:
		if !startsAt.After(now) {
			return domain.PublishPublished
		}
		return domain.PublishScheduled
	default:
		return domain.PublishDraft
	}
}

func (d *DropService) productInputs(req CreateDropRequest) ([]store.ProductInput, error) {
	inputs := req.Products
	if len(inputs) == 0 {
		sizes := req.Sizes
		if len(sizes) == 0 {
			sizes = defaultSizes()
		}
		slug := "default"
		if len(req.Sizes) > 0 || req.PriceCents > 0 {
			slug = "default"
		}
		inputs = []DropProductInput{{
			Slug:           slug,
			Name:           req.Title,
			Description:    req.Description,
			PriceCents:     req.PriceCents,
			ImageURL:       req.HeroImageURL,
			InventoryTotal: req.InventoryTotal,
			Sizes:          sizes,
		}}
	}

	out := make([]store.ProductInput, len(inputs))
	for i, in := range inputs {
		slug, err := validate.NormalizeSlug(in.Slug)
		if err != nil {
			return nil, fmt.Errorf("product %d: %w", i+1, err)
		}
		if in.PriceCents < 0 || in.InventoryTotal < 0 {
			return nil, fmt.Errorf("product %d: invalid price or inventory", i+1)
		}
		sizes := in.Sizes
		if len(sizes) == 0 {
			sizes = defaultSizes()
		}
		out[i] = store.ProductInput{
			ID:             in.ID,
			Slug:           slug,
			Name:           validate.Trim(in.Name),
			Description:    in.Description,
			PriceCents:     in.PriceCents,
			ImageURL:       in.ImageURL,
			SortOrder:      in.SortOrder,
			InventoryTotal: in.InventoryTotal,
			Sizes:          sizes,
		}
	}
	return out, nil
}

func (d *DropService) attachProducts(ctx context.Context, drop *domain.SellerDrop) error {
	products, err := d.products.ListByDropID(ctx, drop.ID)
	if err != nil {
		return err
	}
	drop.Products = products
	return nil
}

func (d *DropService) attachPublicProducts(ctx context.Context, drop *domain.PublicDrop) error {
	products, err := d.products.ListByDropID(ctx, drop.ID)
	if err != nil {
		return err
	}
	drop.Products = products
	return nil
}

func (d *DropService) Create(ctx context.Context, req CreateDropRequest) (domain.SellerDrop, error) {
	if !req.EndsAt.After(req.StartsAt) {
		return domain.SellerDrop{}, errors.New("ends_at must be after starts_at")
	}
	slug, err := validate.NormalizeSlug(req.Slug)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	productInputs, err := d.productInputs(req)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	if len(req.Sizes) == 0 {
		req.Sizes = productInputs[0].Sizes
	}
	req.PublishStatus = normalizePublishStatus(req.PublishStatus, req.StartsAt, time.Now())

	record, err := d.drops.Create(ctx, store.CreateDropInput{
		SellerID:         req.SellerID,
		Slug:             slug,
		Title:            validate.Trim(req.Title),
		Description:      req.Description,
		Story:            req.Story,
		PromoMessage:     req.PromoMessage,
		PriceCents:       productInputs[0].PriceCents,
		Currency:         "USD",
		HeroImageURL:     req.HeroImageURL,
		GalleryImageURLs: req.GalleryImageURLs,
		InventoryTotal:   productInputs[0].InventoryTotal,
		Sizes:            productInputs[0].Sizes,
		StartsAt:         req.StartsAt,
		EndsAt:           req.EndsAt,
		PublishStatus:    req.PublishStatus,
	})
	if err != nil {
		return domain.SellerDrop{}, err
	}
	if err := d.products.ReplaceForDrop(ctx, record.ID, req.SellerID, productInputs); err != nil {
		return domain.SellerDrop{}, err
	}
	record, err = d.drops.GetByIDForSeller(ctx, record.ID, req.SellerID)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	out := record.ToSellerDrop(time.Now())
	_ = d.attachProducts(ctx, &out)
	return out, nil
}

func (d *DropService) Update(ctx context.Context, req CreateDropRequest, dropID string) (domain.SellerDrop, error) {
	if !req.EndsAt.After(req.StartsAt) {
		return domain.SellerDrop{}, errors.New("ends_at must be after starts_at")
	}
	slug, err := validate.NormalizeSlug(req.Slug)
	if err != nil {
		return domain.SellerDrop{}, err
	}

	existing, err := d.drops.GetByIDForSeller(ctx, dropID, req.SellerID)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	productInputs, err := d.productInputs(req)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	req.PublishStatus = normalizePublishStatus(req.PublishStatus, req.StartsAt, time.Now())
	prevRemaining := existing.InventoryRemaining

	record, err := d.drops.Update(ctx, store.UpdateDropInput{
		ID:               dropID,
		SellerID:         req.SellerID,
		Slug:             slug,
		Title:            validate.Trim(req.Title),
		Description:      req.Description,
		Story:            req.Story,
		PromoMessage:     req.PromoMessage,
		PriceCents:       existing.PriceCents,
		HeroImageURL:     req.HeroImageURL,
		GalleryImageURLs: req.GalleryImageURLs,
		InventoryTotal:   existing.InventoryTotal,
		Sizes:            existing.Sizes,
		StartsAt:         req.StartsAt,
		EndsAt:           req.EndsAt,
		PublishStatus:    req.PublishStatus,
	})
	if err != nil {
		return domain.SellerDrop{}, err
	}
	if err := d.products.ReplaceForDrop(ctx, dropID, req.SellerID, productInputs); err != nil {
		return domain.SellerDrop{}, err
	}
	record, err = d.drops.GetByIDForSeller(ctx, dropID, req.SellerID)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	if prevRemaining == 0 && record.InventoryRemaining > 0 && d.notify != nil {
		if err := d.notify.NotifyRestock(ctx, dropID); err != nil {
			log.Printf("enqueue waitlist restock drop=%s: %v", dropID, err)
		}
	}
	if d.inventoryAlerts != nil {
		if err := d.inventoryAlerts.CheckDrop(ctx, dropID); err != nil {
			log.Printf("inventory alert drop=%s: %v", dropID, err)
		}
	}
	out := record.ToSellerDrop(time.Now())
	_ = d.attachProducts(ctx, &out)
	return out, nil
}

func (d *DropService) Get(ctx context.Context, sellerID, dropID string) (domain.SellerDrop, error) {
	record, err := d.drops.GetByIDForSeller(ctx, dropID, sellerID)
	if err != nil {
		return domain.SellerDrop{}, err
	}
	out := record.ToSellerDrop(time.Now())
	_ = d.attachProducts(ctx, &out)
	return out, nil
}

func (d *DropService) Delete(ctx context.Context, sellerID, dropID string) error {
	return d.drops.DeleteForSeller(ctx, dropID, sellerID)
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
		_ = d.attachProducts(ctx, &out[i])
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
	out := record.ToPublicDrop(time.Now())
	_ = d.attachPublicProducts(ctx, &out)
	return out, nil
}

func (d *DropService) ListPublicFeed(ctx context.Context, limit int) ([]domain.PublicDrop, error) {
	records, err := d.drops.ListPublished(ctx, limit)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	out := make([]domain.PublicDrop, len(records))
	for i, r := range records {
		out[i] = r.ToPublicDrop(now)
		_ = d.attachPublicProducts(ctx, &out[i])
	}
	return out, nil
}

func (d *DropService) PublishDueScheduled(ctx context.Context) (int, error) {
	return d.drops.PublishDueScheduled(ctx, time.Now())
}

func defaultSizes() []domain.DropSize {
	return []domain.DropSize{
		{ID: "s", Label: "S", Available: true},
		{ID: "m", Label: "M", Available: true},
		{ID: "l", Label: "L", Available: true},
		{ID: "xl", Label: "XL", Available: true},
	}
}
