package seed

import (
	"context"
	"fmt"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

type catalogState string

const (
	catalogLive      catalogState = "live"
	catalogUpcoming  catalogState = "upcoming"
	catalogScheduled catalogState = "scheduled"
	catalogDraft     catalogState = "draft"
	catalogExpired   catalogState = "expired"
	catalogSoldOut   catalogState = "sold_out"
)

type catalogSeed struct {
	slug, title, category, material, inspiration string
	image, currency, sizeKind                    string
	price, inventory, remaining, waitlist        int
	state                                        catalogState
}

func seedTestCatalog(ctx context.Context, s *store.Store, sellerID string) error {
	for i, item := range testCatalog() {
		dropInput := item.dropInput(sellerID, i, time.Now().UTC())
		drop, err := s.Drops().Create(ctx, dropInput)
		if err == store.ErrConflict {
			drop, err = s.Drops().GetBySellerAndSlug(ctx, TestSellerSlug, item.slug)
		}
		if err != nil {
			return fmt.Errorf("seed catalog drop %q: %w", item.slug, err)
		}

		products, err := s.Products().ListByDropID(ctx, drop.ID)
		if err != nil {
			return fmt.Errorf("list catalog products for %q: %w", item.slug, err)
		}
		productID := ""
		for _, product := range products {
			if product.Slug == "default" {
				productID = product.ID
				break
			}
		}
		if err := s.Products().ReplaceForDrop(ctx, drop.ID, sellerID, []store.ProductInput{{
			ID:             productID,
			Slug:           "default",
			Name:           item.title,
			Description:    dropInput.Description,
			PriceCents:     item.price,
			ImageURL:       item.image,
			InventoryTotal: item.inventory,
			Sizes:          catalogSizes(item.sizeKind),
		}}); err != nil {
			return fmt.Errorf("seed catalog product %q: %w", item.slug, err)
		}
		if err := patchCatalogStats(ctx, s, drop.ID, item.remaining, item.waitlist); err != nil {
			return fmt.Errorf("patch catalog stats %q: %w", item.slug, err)
		}
	}
	return nil
}

func (item catalogSeed) dropInput(sellerID string, index int, now time.Time) store.CreateDropInput {
	startsAt, endsAt, publishStatus := catalogWindow(item.state, index, now)
	description := fmt.Sprintf(
		"%s in %s. A limited %s release built for everyday rotation.",
		item.title,
		item.material,
		item.category,
	)
	story := fmt.Sprintf(
		"Inspired by %s, this piece balances Japanese streetwear details with a clean modern silhouette.",
		item.inspiration,
	)
	var promo *string
	if index%4 == 0 {
		message := "Free domestic shipping while this drop is live"
		promo = &message
	}

	return store.CreateDropInput{
		SellerID:         sellerID,
		Slug:             item.slug,
		Title:            item.title,
		Description:      description,
		Story:            story,
		PromoMessage:     promo,
		PriceCents:       item.price,
		Currency:         item.currency,
		HeroImageURL:     item.image,
		GalleryImageURLs: []string{item.image + "&fit=crop", item.image + "&sat=-15"},
		InventoryTotal:   item.inventory,
		Sizes:            catalogSizes(item.sizeKind),
		StartsAt:         startsAt,
		EndsAt:           endsAt,
		PublishStatus:    publishStatus,
	}
}

func catalogWindow(
	state catalogState,
	index int,
	now time.Time,
) (time.Time, time.Time, domain.PublishStatus) {
	day := 24 * time.Hour
	switch state {
	case catalogUpcoming:
		start := now.Add(time.Duration(index%7+1) * day)
		return start, start.Add(7 * day), domain.PublishPublished
	case catalogScheduled:
		start := now.Add(time.Duration(index%7+2) * day)
		return start, start.Add(8 * day), domain.PublishScheduled
	case catalogDraft:
		start := now.Add(time.Duration(index%10+5) * day)
		return start, start.Add(7 * day), domain.PublishDraft
	case catalogExpired:
		end := now.Add(-time.Duration(index%10+1) * day)
		return end.Add(-7 * day), end, domain.PublishPublished
	default:
		start := now.Add(-time.Duration(index%5+1) * day)
		return start, now.Add(time.Duration(index%6+2) * day), domain.PublishPublished
	}
}

func patchCatalogStats(
	ctx context.Context,
	s *store.Store,
	dropID string,
	remaining, waitlist int,
) error {
	if _, err := s.Pool().Exec(ctx, `
		UPDATE drop_products
		SET inventory_remaining = LEAST($2, inventory_total), updated_at = now()
		WHERE drop_id = $1
	`, dropID, remaining); err != nil {
		return err
	}
	_, err := s.Pool().Exec(ctx, `
		UPDATE drops
		SET inventory_remaining = LEAST($2, inventory_total),
			waitlist_count = $3,
			updated_at = now()
		WHERE id = $1
	`, dropID, remaining, waitlist)
	return err
}

func catalogSizes(kind string) []domain.DropSize {
	switch kind {
	case "one":
		return []domain.DropSize{{ID: "one", Label: "One size", Available: true}}
	case "numeric":
		return []domain.DropSize{
			{ID: "28", Label: "28", Available: true},
			{ID: "30", Label: "30", Available: true},
			{ID: "32", Label: "32", Available: true},
			{ID: "34", Label: "34", Available: true},
			{ID: "36", Label: "36", Available: true},
		}
	default:
		return defaultSizes()
	}
}

func testCatalog() []catalogSeed {
	return []catalogSeed{
		{"shibuya-night-hoodie", "Shibuya Night Hoodie", "hoodie", "460gsm brushed cotton", "Shibuya after midnight", "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1600&q=80", "USD", "alpha", 9800, 120, 43, 186, catalogLive},
		{"indigo-sashiko-jacket", "Indigo Sashiko Jacket", "jacket", "washed indigo canvas", "traditional sashiko repair work", "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1600&q=80", "USD", "alpha", 16800, 60, 18, 94, catalogLive},
		{"tokyo-rain-shell", "Tokyo Rain Shell", "outerwear", "waterproof recycled nylon", "summer rain over Tokyo", "https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1600&q=80", "USD", "alpha", 14200, 75, 51, 62, catalogLive},
		{"neon-kanji-tee", "Neon Kanji Tee", "t-shirt", "240gsm organic cotton", "Kabukicho neon signs", "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1600&q=80", "USD", "alpha", 4800, 200, 132, 248, catalogLive},
		{"sumi-wide-pants", "Sumi Wide Pants", "trousers", "garment-dyed cotton twill", "sumi ink gradients", "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=1600&q=80", "USD", "numeric", 9200, 90, 36, 75, catalogLive},
		{"koi-knit-vest", "Koi Knit Vest", "knitwear", "merino wool blend", "koi moving through dark water", "https://images.unsplash.com/photo-1610652492500-ded49ceeb378?w=1600&q=80", "USD", "alpha", 7600, 80, 9, 132, catalogLive},
		{"yuzu-canvas-tote", "Yuzu Canvas Tote", "bag", "heavyweight waxed canvas", "winter yuzu harvests", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1600&q=80", "USD", "one", 3800, 150, 87, 41, catalogLive},
		{"moon-phase-cap", "Moon Phase Cap", "headwear", "washed cotton", "the lunar calendar", "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1600&q=80", "USD", "one", 3400, 100, 28, 110, catalogLive},
		{"onsen-waffle-robe", "Onsen Waffle Robe", "robe", "waffle-knit cotton", "mountain onsen mornings", "https://images.unsplash.com/photo-1578681994506-b8f463449011?w=1600&q=80", "USD", "alpha", 11200, 45, 22, 38, catalogLive},
		{"matcha-running-shorts", "Matcha Running Shorts", "shorts", "four-way stretch ripstop", "Uji tea fields", "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=1600&q=80", "USD", "alpha", 5900, 110, 64, 53, catalogLive},
		{"osaka-track-jacket", "Osaka Track Jacket", "track jacket", "recycled technical jersey", "Osaka street racing culture", "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=1600&q=80", "USD", "alpha", 10400, 85, 47, 96, catalogLive},
		{"bogota-bomber", "Bogotá Night Bomber", "bomber jacket", "satin flight nylon", "Bogotá murals after dark", "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1600&q=80", "COP", "alpha", 48900000, 55, 31, 83, catalogLive},
		{"sakura-varsity", "Sakura Varsity Jacket", "varsity jacket", "melton wool and vegan leather", "falling sakura petals", "https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=1600&q=80", "USD", "alpha", 18400, 70, 70, 174, catalogUpcoming},
		{"carbon-cargo", "Carbon Utility Cargo", "cargo pants", "abrasion-resistant canvas", "Tokyo utility uniforms", "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=1600&q=80", "USD", "numeric", 10800, 95, 95, 58, catalogUpcoming},
		{"kyoto-linen-shirt", "Kyoto Linen Shirt", "shirt", "washed Japanese linen", "Kyoto machiya screens", "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=1600&q=80", "USD", "alpha", 8600, 100, 100, 121, catalogScheduled},
		{"calavera-ink-tee", "Calavera Ink Tee", "t-shirt", "heavy cotton jersey", "Mexico City print studios", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600&q=80", "MXN", "alpha", 149900, 180, 180, 206, catalogScheduled},
		{"rio-mesh-jersey", "Rio Mesh Jersey", "jersey", "breathable recycled mesh", "Rio beach football", "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=1600&q=80", "BRL", "alpha", 42900, 140, 140, 167, catalogScheduled},
		{"cloud-puffer", "Cloud Line Puffer", "puffer jacket", "recycled down alternative", "clouds over Mount Fuji", "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=1600&q=80", "USD", "alpha", 19600, 50, 50, 223, catalogUpcoming},
		{"crane-denim", "Crane Selvedge Denim", "denim", "14oz selvedge denim", "red-crowned cranes", "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1600&q=80", "USD", "numeric", 12800, 65, 65, 89, catalogUpcoming},
		{"midnight-haori", "Midnight Haori", "overshirt", "textured cotton jacquard", "moonlit temple roofs", "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1600&q=80", "USD", "alpha", 13600, 75, 75, 154, catalogScheduled},
		{"archive-wave-sweater", "Archive Wave Sweater", "sweater", "lambswool blend", "Hokusai wave studies", "https://images.unsplash.com/photo-1579953074559-6b3f2fc085c3?w=1600&q=80", "USD", "alpha", 8800, 80, 14, 73, catalogExpired},
		{"red-sun-coach", "Red Sun Coach Jacket", "coach jacket", "matte nylon", "vintage rising-sun graphics", "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1600&q=80", "USD", "alpha", 9400, 90, 27, 118, catalogExpired},
		{"zen-garden-tee", "Zen Garden Tee", "t-shirt", "slub cotton", "raked gravel gardens", "https://images.unsplash.com/photo-1583743814966-8936f37f4ec2?w=1600&q=80", "USD", "alpha", 4400, 160, 33, 91, catalogExpired},
		{"copper-field-bag", "Copper Field Bag", "crossbody bag", "ballistic nylon", "aged temple copper", "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&q=80", "USD", "one", 6800, 75, 19, 46, catalogExpired},
		{"snow-monkey-beanie", "Snow Monkey Beanie", "beanie", "ribbed merino wool", "Jigokudani winter", "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=1600&q=80", "USD", "one", 3200, 120, 11, 137, catalogExpired},
		{"prototype-modular-coat", "Prototype Modular Coat", "coat", "bonded technical cotton", "transformable industrial design", "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=1600&q=80", "USD", "alpha", 22400, 40, 40, 0, catalogDraft},
		{"studio-pleated-trouser", "Studio Pleated Trouser", "trousers", "wool-blend suiting", "Tokyo design ateliers", "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1600&q=80", "USD", "numeric", 11600, 70, 70, 0, catalogDraft},
		{"paper-lantern-shirt", "Paper Lantern Shirt", "shirt", "sheer cotton voile", "Gion lantern light", "https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=1600&q=80", "USD", "alpha", 7900, 85, 85, 0, catalogDraft},
		{"signal-orange-pack", "Signal Orange Pack", "backpack", "recycled Cordura", "railway signal colors", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1600&q=80&sat=25", "USD", "one", 12400, 55, 55, 0, catalogDraft},
		{"ghost-orchid-hoodie", "Ghost Orchid Hoodie", "hoodie", "premium loopback cotton", "rare night-blooming orchids", "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1600&q=80", "USD", "alpha", 10200, 100, 0, 318, catalogSoldOut},
		{"metro-card-wallet", "Metro Card Wallet", "wallet", "vegetable-tanned leather", "Tokyo transit maps", "https://images.unsplash.com/photo-1627123424574-724758594e93?w=1600&q=80", "USD", "one", 4600, 140, 0, 245, catalogSoldOut},
		{"electric-koi-shirt", "Electric Koi Shirt", "shirt", "printed rayon", "koi under arcade lights", "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=1600&q=80", "USD", "alpha", 8400, 95, 0, 287, catalogSoldOut},
	}
}
