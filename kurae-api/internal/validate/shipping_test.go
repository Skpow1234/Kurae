package validate

import "testing"

func TestNormalizeShippingAddress(t *testing.T) {
	addr, err := NormalizeShippingAddress(ShippingAddressInput{
		Name:       " Yuki Tanaka ",
		Line1:      "1-2-3 Shibuya",
		City:       "Tokyo",
		Region:     "Tokyo",
		PostalCode: "150-0001",
		Country:    "jp",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if addr.Country != "JP" || addr.Name != "Yuki Tanaka" {
		t.Fatalf("unexpected normalized address: %+v", addr)
	}
}

func TestNormalizeShippingAddressMissingFields(t *testing.T) {
	_, err := NormalizeShippingAddress(ShippingAddressInput{
		Name:  "Test",
		Line1: "123 Main",
		City:  "NYC",
	})
	if err != ErrInvalidShippingAddress {
		t.Fatalf("expected ErrInvalidShippingAddress, got %v", err)
	}
}
