package store

import (
	"context"
	"errors"
	"strings"
)

type ReferralPreviewRecord struct {
	Code          string
	ReferrerLabel string
	SellerName    string
	SellerSlug    string
	DropTitle     string
	DropSlug      string
	Description   string
	HeroImageURL  string
	LogoURL       string
	Accent        string
}

func firstReferrerLabel(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "A friend"
	}
	if parts := strings.Fields(name); len(parts) > 0 {
		return parts[0]
	}
	return name
}

func (r *ReferralRepository) BuildPreview(
	ctx context.Context,
	sellerSlug, dropSlug, code string,
) (ReferralPreviewRecord, error) {
	sellerProfile, err := r.store.Sellers().GetPublicProfileBySlug(ctx, sellerSlug)
	if errors.Is(err, ErrNotFound) {
		return ReferralPreviewRecord{}, ErrNotFound
	}
	if err != nil {
		return ReferralPreviewRecord{}, err
	}

	seller, err := r.store.Sellers().GetBySlug(ctx, sellerSlug)
	if err != nil {
		return ReferralPreviewRecord{}, err
	}

	dropID := ""
	out := ReferralPreviewRecord{
		SellerName: sellerProfile.Name,
		SellerSlug: sellerProfile.Slug,
		LogoURL:    sellerProfile.LogoURL,
		Accent:     sellerProfile.Accent,
	}

	if strings.TrimSpace(dropSlug) != "" {
		drop, err := r.store.Drops().GetBySellerAndSlug(ctx, sellerSlug, dropSlug)
		if errors.Is(err, ErrNotFound) {
			return ReferralPreviewRecord{}, ErrNotFound
		}
		if err != nil {
			return ReferralPreviewRecord{}, err
		}
		dropID = drop.ID
		out.DropTitle = drop.Title
		out.DropSlug = drop.Slug
		out.Description = drop.Description
		out.HeroImageURL = drop.HeroImageURL
	} else {
		out.Description = sellerProfile.Bio
	}

	rec, err := r.LookupForAttribution(ctx, seller.ID, dropID, code)
	if errors.Is(err, ErrNotFound) {
		return ReferralPreviewRecord{}, ErrNotFound
	}
	if err != nil {
		return ReferralPreviewRecord{}, err
	}

	out.Code = rec.Code
	out.ReferrerLabel = "A friend"
	if rec.BuyerID != nil {
		buyer, err := r.store.Buyers().GetByID(ctx, *rec.BuyerID)
		if err == nil {
			out.ReferrerLabel = firstReferrerLabel(buyer.Name)
		}
	}

	if out.HeroImageURL == "" && out.LogoURL != "" {
		out.HeroImageURL = out.LogoURL
	}

	return out, nil
}

func (r *ReferralRepository) GetPreviewByDropID(
	ctx context.Context,
	dropID, code string,
) (ReferralPreviewRecord, string, error) {
	drop, err := r.store.Drops().GetByID(ctx, dropID)
	if errors.Is(err, ErrNotFound) {
		return ReferralPreviewRecord{}, "", ErrNotFound
	}
	if err != nil {
		return ReferralPreviewRecord{}, "", err
	}

	seller, err := r.store.Sellers().GetByID(ctx, drop.SellerID)
	if err != nil {
		return ReferralPreviewRecord{}, "", err
	}

	preview, err := r.BuildPreview(ctx, seller.Slug, drop.Slug, code)
	return preview, seller.Slug, err
}
