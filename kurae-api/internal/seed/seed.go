package seed

import (
	"context"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

// Demo seeds match kurae-web mock drops for local integration.
func Run(ctx context.Context, s *store.Store) error {
	hash, err := bcrypt.GenerateFromPassword([]byte("demo1234"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	seller, err := s.Sellers().Create(ctx, "demo@hana.studio", string(hash), "Hana Studio", "hana-studio")
	if err != nil && err != store.ErrConflict {
		return err
	}
	if err == store.ErrConflict {
		seller, err = s.Sellers().GetBySlug(ctx, "hana-studio")
		if err != nil {
			return err
		}
	}

	now := time.Now()
	demos := []store.CreateDropInput{
		{
			SellerID: seller.ID, Slug: "sakura-hoodie", Title: "Sakura Hoodie — Drop 001",
			Description: "Heavyweight fleece. Embroidered petal mark. Limited to 120 units.",
			Story:       "Inspired by late-season sakura — dusty blush on warm stone.",
			PriceCents: 8900, InventoryTotal: 120,
			HeroImageURL: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&q=80",
			GalleryImageURLs: []string{
				"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
			},
			StartsAt: now.Add(-2 * time.Hour), EndsAt: now.Add(5 * 24 * time.Hour),
			PublishStatus: domain.PublishPublished,
			Sizes: defaultSizes(),
		},
	}

	for _, d := range demos {
		_, err := s.Drops().Create(ctx, d)
		if err == store.ErrConflict {
			continue
		}
		if err != nil {
			return err
		}
	}
	return nil
}

func defaultSizes() []domain.DropSize {
	return []domain.DropSize{
		{ID: "s", Label: "S", Available: true},
		{ID: "m", Label: "M", Available: true},
		{ID: "l", Label: "L", Available: true},
		{ID: "xl", Label: "XL", Available: true},
	}
}
