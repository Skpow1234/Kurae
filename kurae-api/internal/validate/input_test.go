package validate

import "testing"

func TestNormalizeSlug(t *testing.T) {
	t.Parallel()

	got, err := NormalizeSlug("  Hana-Studio  ")
	if err != nil || got != "hana-studio" {
		t.Fatalf("got %q err %v", got, err)
	}

	if _, err := NormalizeSlug("bad slug!"); err == nil {
		t.Fatal("expected invalid slug error")
	}
}

func TestNormalizeEmail(t *testing.T) {
	t.Parallel()

	got, err := NormalizeEmail("  Buyer@Example.COM ")
	if err != nil || got != "buyer@example.com" {
		t.Fatalf("got %q err %v", got, err)
	}

	if _, err := NormalizeEmail("not-an-email"); err == nil {
		t.Fatal("expected invalid email error")
	}
}
