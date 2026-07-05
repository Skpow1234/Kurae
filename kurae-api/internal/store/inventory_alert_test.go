package store

import "testing"

func TestInventoryThreshold20Percent(t *testing.T) {
	tests := []struct {
		total int
		want  int
	}{
		{0, 0},
		{10, 2},
		{25, 5},
		{100, 20},
		{4, 1},
	}
	for _, tc := range tests {
		if got := InventoryThreshold20Percent(tc.total); got != tc.want {
			t.Fatalf("InventoryThreshold20Percent(%d) = %d, want %d", tc.total, got, tc.want)
		}
	}
}
