package seed

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"golang.org/x/crypto/bcrypt"
)

const (
	TestSellerEmail    = "test.seller@kurae.dev"
	TestSellerPassword = "KuraeTest123!"
	TestSellerSlug     = "kurae-test-store"
	TestBuyerEmail     = "test.buyer@kurae.dev"
	TestBuyerPassword  = "KuraeTest123!"
)

// Demo account: demo@hana.studio / demo1234
// Storefront: /hana-studio/{drop-slug}
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
	promo := "Domestic shipping free on orders over $100"
	promo2 := "Drop 002 — notify list opens 72h before launch"
	promo3 := "Sold out — join the waitlist for possible restock"

	demos := []store.CreateDropInput{
		{
			SellerID: seller.ID, Slug: "sakura-hoodie", Title: "Sakura Hoodie — Drop 001",
			Description:  "Heavyweight fleece. Embroidered petal mark. Limited to 120 units.",
			Story:        "Inspired by late-season sakura — dusty blush on warm stone. Cut wide, dropped shoulder, woven label at hem.",
			PromoMessage: &promo, PriceCents: 8900, InventoryTotal: 120,
			HeroImageURL: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&q=80",
			GalleryImageURLs: []string{
				"https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
				"https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
			},
			StartsAt: now.Add(-2 * time.Hour), EndsAt: now.Add(5 * 24 * time.Hour),
			PublishStatus: domain.PublishPublished, Sizes: defaultSizes(),
		},
		{
			SellerID: seller.ID, Slug: "sakura-tee", Title: "Sakura Tee — Drop 002",
			Description:  "Soft cotton tee. Screen-printed petal graphic.",
			Story:        "Lightweight tee for spring layering.",
			PromoMessage: &promo2, PriceCents: 4500, InventoryTotal: 200,
			HeroImageURL:     "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1600&q=80",
			GalleryImageURLs: []string{},
			StartsAt:         now.Add(3 * 24 * time.Hour), EndsAt: now.Add(10 * 24 * time.Hour),
			PublishStatus: domain.PublishPublished, Sizes: defaultSizes(),
		},
		{
			SellerID: seller.ID, Slug: "sakura-cap", Title: "Sakura Cap — Drop 000",
			Description:  "Structured cap with embroidered kanji.",
			Story:        "Sold out release from last season.",
			PromoMessage: &promo3, PriceCents: 3500, InventoryTotal: 80,
			HeroImageURL:     "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1600&q=80",
			GalleryImageURLs: []string{},
			StartsAt:         now.Add(-7 * 24 * time.Hour), EndsAt: now.Add(2 * 24 * time.Hour),
			PublishStatus: domain.PublishPublished, Sizes: defaultSizes(),
		},
		{
			SellerID: seller.ID, Slug: "winter-bloom", Title: "Winter Bloom Jacket",
			Description: "Insulated jacket. Limited run.",
			Story:       "Past season drop.",
			PriceCents:  12000, InventoryTotal: 50,
			HeroImageURL:     "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1600&q=80",
			GalleryImageURLs: []string{},
			StartsAt:         now.Add(-30 * 24 * time.Hour), EndsAt: now.Add(-2 * 24 * time.Hour),
			PublishStatus: domain.PublishPublished, Sizes: defaultSizes(),
		},
	}

	dropIDs := map[string]string{}
	for _, d := range demos {
		record, err := s.Drops().Create(ctx, d)
		if err == store.ErrConflict {
			existing, gerr := s.Drops().GetBySellerAndSlug(ctx, "hana-studio", d.Slug)
			if gerr != nil {
				return gerr
			}
			dropIDs[d.Slug] = existing.ID
			continue
		}
		if err != nil {
			return err
		}
		dropIDs[d.Slug] = record.ID
	}

	if err := patchDropStats(ctx, s, dropIDs["sakura-hoodie"], 47, 384); err != nil {
		return err
	}
	if err := patchDropStats(ctx, s, dropIDs["sakura-tee"], 200, 128); err != nil {
		return err
	}
	if err := patchDropStats(ctx, s, dropIDs["sakura-cap"], 0, 512); err != nil {
		return err
	}
	if err := patchDropStats(ctx, s, dropIDs["winter-bloom"], 12, 89); err != nil {
		return err
	}

	if err := seedOrders(ctx, s, seller.ID, dropIDs); err != nil {
		return err
	}
	testSeller, err := seedTestAccounts(ctx, s)
	if err != nil {
		return err
	}
	return seedTestCatalog(ctx, s, testSeller.ID)
}

func seedTestAccounts(ctx context.Context, s *store.Store) (domain.Seller, error) {
	sellerHash, err := bcrypt.GenerateFromPassword(
		[]byte(TestSellerPassword),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return domain.Seller{}, err
	}

	testSeller, err := s.Sellers().Create(
		ctx,
		TestSellerEmail,
		string(sellerHash),
		"Kurae Test Store",
		TestSellerSlug,
	)
	if err != nil && err != store.ErrConflict {
		return domain.Seller{}, err
	}
	if err == store.ErrConflict {
		testSeller, err = s.Sellers().GetBySlug(ctx, TestSellerSlug)
		if err != nil {
			return domain.Seller{}, fmt.Errorf("get test seller: %w", err)
		}
	}
	if err := s.Sellers().UpdatePasswordHash(ctx, testSeller.ID, string(sellerHash)); err != nil {
		return domain.Seller{}, fmt.Errorf("reset test seller password: %w", err)
	}

	buyerHash, err := bcrypt.GenerateFromPassword(
		[]byte(TestBuyerPassword),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return domain.Seller{}, err
	}
	testBuyer, err := s.Buyers().Create(
		ctx,
		TestBuyerEmail,
		string(buyerHash),
		"Kurae Test Buyer",
	)
	if err != nil && err != store.ErrConflict {
		return domain.Seller{}, err
	}
	if err == store.ErrConflict {
		testBuyer, err = s.Buyers().GetByEmail(ctx, TestBuyerEmail)
		if err != nil {
			return domain.Seller{}, fmt.Errorf("get test buyer: %w", err)
		}
	}
	if err := s.Buyers().UpdatePasswordHash(ctx, testBuyer.ID, string(buyerHash)); err != nil {
		return domain.Seller{}, fmt.Errorf("reset test buyer password: %w", err)
	}

	return testSeller, nil
}

func patchDropStats(ctx context.Context, s *store.Store, dropID string, remaining, waitlist int) error {
	if dropID == "" {
		return nil
	}
	_, err := s.Pool().Exec(ctx, `
		UPDATE drops SET inventory_remaining = $2, waitlist_count = $3, updated_at = now()
		WHERE id = $1
	`, dropID, remaining, waitlist)
	return err
}

func seedOrders(ctx context.Context, s *store.Store, sellerID string, dropIDs map[string]string) error {
	hoodieID := dropIDs["sakura-hoodie"]
	if hoodieID == "" {
		return nil
	}

	type orderSeed struct {
		email, size, status string
		amount              int
		daysAgo             int
	}

	seeds := []orderSeed{
		{"yuki.tanaka@email.com", "M", "fulfilled", 8900, 1},
		{"kenji.sato@email.com", "L", "paid", 8900, 2},
		{"mia.chen@email.com", "S", "paid", 8900, 3},
		{"alex@example.com", "XL", "payment_pending", 8900, 0},
		{"fan@example.com", "M", "payment_pending", 8900, 0},
		{"buyer1@email.com", "S", "fulfilled", 8900, 5},
	}

	for _, o := range seeds {
		id := uuid.NewString()
		created := time.Now().Add(-time.Duration(o.daysAgo) * 24 * time.Hour)
		tag, err := s.Pool().Exec(ctx, `
			INSERT INTO orders (id, seller_id, drop_id, buyer_email, size_label, status, amount_cents, currency, created_at, updated_at)
			SELECT $1, $2, $3, $4, $5, $6, $7, 'USD', $8, $8
			WHERE NOT EXISTS (
				SELECT 1 FROM orders WHERE seller_id = $2 AND buyer_email = $4 AND drop_id = $3
			)
		`, id, sellerID, hoodieID, o.email, o.size, o.status, o.amount, created)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			continue
		}
		_, err = s.Pool().Exec(ctx, `
			INSERT INTO audit_events (entity_type, entity_id, action, metadata, created_at)
			VALUES ('order', $1, $2, '{}', $3)
		`, id, o.status, created)
		if err != nil {
			return fmt.Errorf("audit for order %s: %w", id, err)
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
