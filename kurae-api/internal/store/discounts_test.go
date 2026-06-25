package store_test

import (
	"testing"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestComputeDiscountCents(t *testing.T) {
	tests := []struct {
		name     string
		subtotal int
		typ      domain.DiscountType
		value    int
		want     int
	}{
		{"ten percent", 5000, domain.DiscountPercent, 10, 500},
		{"fixed partial", 5000, domain.DiscountFixed, 500, 500},
		{"fixed exceeds subtotal", 300, domain.DiscountFixed, 500, 300},
		{"hundred percent", 1200, domain.DiscountPercent, 100, 1200},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := store.ComputeDiscountCents(tc.subtotal, tc.typ, tc.value)
			if got != tc.want {
				t.Fatalf("got %d want %d", got, tc.want)
			}
		})
	}
}
