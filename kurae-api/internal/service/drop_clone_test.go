package service

import (
	"testing"

	"github.com/kurae/kurae-api/internal/domain"
)

func TestCloneProductsFromDropUsesProductVariants(t *testing.T) {
	source := domain.SellerDrop{
		PublicDrop: domain.PublicDrop{
			Title: "Main drop",
			Products: []domain.DropProduct{
				{
					Slug:           "hoodie",
					Name:           "Hoodie",
					PriceCents:     8000,
					InventoryTotal: 25,
					Sizes:          []domain.DropSize{{Label: "M", Available: true}},
				},
				{
					Slug:           "tee",
					Name:           "Tee",
					PriceCents:     4000,
					InventoryTotal: 40,
				},
			},
		},
	}

	products := cloneProductsFromDrop(source)
	if len(products) != 2 {
		t.Fatalf("expected 2 cloned products, got %d", len(products))
	}
	if products[0].InventoryTotal != 25 {
		t.Fatalf("expected full inventory copied, got %d", products[0].InventoryTotal)
	}
}

func TestCloneProductsFromDropLegacySingleProduct(t *testing.T) {
	source := domain.SellerDrop{
		PublicDrop: domain.PublicDrop{
			Title:          "Legacy drop",
			Description:    "Desc",
			PriceCents:     5000,
			InventoryTotal: 30,
			HeroImageURL:   "https://example.com/hero.jpg",
			Sizes:          []domain.DropSize{{Label: "L", Available: true}},
		},
	}

	products := cloneProductsFromDrop(source)
	if len(products) != 1 {
		t.Fatalf("expected 1 legacy product, got %d", len(products))
	}
	if products[0].Slug != "default" {
		t.Fatalf("unexpected slug %q", products[0].Slug)
	}
}

func TestCopyDropSizes(t *testing.T) {
	src := []domain.DropSize{{Label: "S", Available: true}}
	out := copyDropSizes(src)
	out[0].Available = false
	if src[0].Available {
		t.Fatal("expected copied size slice")
	}
}
