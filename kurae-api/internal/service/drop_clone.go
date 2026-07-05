package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/validate"
)

func (d *DropService) Clone(ctx context.Context, sellerID, sourceDropID string) (domain.SellerDrop, error) {
	source, err := d.Get(ctx, sellerID, sourceDropID)
	if err != nil {
		return domain.SellerDrop{}, err
	}

	slug, err := d.uniqueSlugForSeller(ctx, sellerID, source.Slug+"-copy")
	if err != nil {
		return domain.SellerDrop{}, err
	}

	now := time.Now()
	title := strings.TrimSpace(source.Title)
	if title == "" {
		title = "Untitled drop"
	}
	title = title + " (Copy)"

	req := CreateDropRequest{
		SellerID:         sellerID,
		Slug:             slug,
		Title:            title,
		Description:      source.Description,
		Story:            source.Story,
		PromoMessage:     source.PromoMessage,
		HeroImageURL:     source.HeroImageURL,
		GalleryImageURLs: append([]string(nil), source.GalleryImageURLs...),
		Products:         cloneProductsFromDrop(source),
		StartsAt:         now.Add(24 * time.Hour),
		EndsAt:           now.Add(7 * 24 * time.Hour),
		PublishStatus:    domain.PublishDraft,
	}

	return d.Create(ctx, req)
}

func cloneProductsFromDrop(source domain.SellerDrop) []DropProductInput {
	if len(source.Products) > 0 {
		out := make([]DropProductInput, len(source.Products))
		for i, product := range source.Products {
			out[i] = DropProductInput{
				Slug:           product.Slug,
				Name:           product.Name,
				Description:    product.Description,
				PriceCents:     product.PriceCents,
				ImageURL:       product.ImageURL,
				SortOrder:      product.SortOrder,
				InventoryTotal: product.InventoryTotal,
				Sizes:          copyDropSizes(product.Sizes),
			}
		}
		return out
	}

	inventoryTotal := source.InventoryTotal
	if inventoryTotal <= 0 {
		inventoryTotal = 50
	}

	return []DropProductInput{{
		Slug:           "default",
		Name:           source.Title,
		Description:    source.Description,
		PriceCents:     source.PriceCents,
		ImageURL:       source.HeroImageURL,
		InventoryTotal: inventoryTotal,
		Sizes:          copyDropSizes(source.Sizes),
	}}
}

func copyDropSizes(sizes []domain.DropSize) []domain.DropSize {
	if len(sizes) == 0 {
		return nil
	}
	out := make([]domain.DropSize, len(sizes))
	copy(out, sizes)
	return out
}

func (d *DropService) uniqueSlugForSeller(ctx context.Context, sellerID, base string) (string, error) {
	slug, err := validate.NormalizeSlug(base)
	if err != nil {
		return "", err
	}

	candidate := slug
	for i := 0; i < 50; i++ {
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", slug, i+1)
		}
		exists, err := d.drops.SlugExistsForSeller(ctx, sellerID, candidate)
		if err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", errors.New("could not generate unique slug")
}
