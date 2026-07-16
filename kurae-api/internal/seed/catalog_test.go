package seed

import "testing"

func TestCatalogHasVariedSeedData(t *testing.T) {
	t.Parallel()

	catalog := testCatalog()
	if len(catalog) < 30 {
		t.Fatalf("expected at least 30 catalog items, got %d", len(catalog))
	}

	slugs := make(map[string]struct{}, len(catalog))
	states := make(map[catalogState]struct{})
	currencies := make(map[string]struct{})
	for _, item := range catalog {
		if _, exists := slugs[item.slug]; exists {
			t.Fatalf("duplicate catalog slug %q", item.slug)
		}
		slugs[item.slug] = struct{}{}
		states[item.state] = struct{}{}
		currencies[item.currency] = struct{}{}
		if item.title == "" || item.image == "" || item.inventory <= 0 {
			t.Fatalf("incomplete catalog item %q", item.slug)
		}
		if item.remaining < 0 || item.remaining > item.inventory {
			t.Fatalf("invalid inventory for %q", item.slug)
		}
	}

	if len(states) < 6 {
		t.Fatalf("expected all catalog states, got %d", len(states))
	}
	if len(currencies) < 4 {
		t.Fatalf("expected varied currencies, got %d", len(currencies))
	}
}
