package service

import (
	"strings"
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestWriteOrderExportRow(t *testing.T) {
	discount := "SAVE10"
	referral := "FRIEND"
	shippedAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	createdAt := time.Date(2026, 5, 31, 10, 0, 0, 0, time.UTC)

	var b strings.Builder
	writeOrderExportRow(&b, store.OrderRecord{
		ID:                   "ord_123",
		DropTitle:            "Spring Drop",
		DropSlug:             "spring-drop",
		ProductName:          "Hoodie",
		SizeLabel:            "M",
		BuyerEmail:           "buyer@example.com",
		Status:               domain.OrderPaid,
		SubtotalCents:        8000,
		DiscountCents:        800,
		DiscountCodeSnapshot: &discount,
		ReferralCodeSnapshot: &referral,
		AmountCents:          7200,
		Currency:             "USD",
		UTMSource:            "instagram",
		UTMCampaign:          "launch",
		TrackingNumber:       "1Z999",
		ShippedAt:            &shippedAt,
		ShippingAddress: &domain.ShippingAddress{
			Name:       "Alex Buyer",
			Line1:      "123 Main St",
			City:       "Tokyo",
			Region:     "TK",
			PostalCode: "100-0001",
			Country:    "JP",
		},
		CreatedAt: createdAt,
	})

	line := b.String()
	if !strings.Contains(line, "ord_123") {
		t.Fatalf("expected order id in row: %q", line)
	}
	if !strings.Contains(line, "Spring Drop") {
		t.Fatalf("expected drop title: %q", line)
	}
	if !strings.Contains(line, "instagram") {
		t.Fatalf("expected utm source: %q", line)
	}
	if !strings.Contains(line, "SAVE10") {
		t.Fatalf("expected discount code: %q", line)
	}
}

func TestOrderCSVCellQuotesCommas(t *testing.T) {
	got := orderCSVCell(`line "two", value`)
	if got != `"line ""two"", value"` {
		t.Fatalf("unexpected escaped cell: %q", got)
	}
}
