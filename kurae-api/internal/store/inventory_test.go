package store

import "testing"

func TestReconcileInventoryRemaining(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		oldTotal    int
		oldRemain   int
		newTotal    int
		wantRemain  int
		wantErr     bool
	}{
		{"increase total", 10, 4, 20, 14, false},
		{"decrease total within sold", 10, 4, 8, 2, false},
		{"cannot go below sold", 10, 4, 5, 0, true},
		{"unchanged", 10, 10, 10, 10, false},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := ReconcileInventoryRemaining(tt.oldTotal, tt.oldRemain, tt.newTotal)
			if tt.wantErr {
				if err == nil {
					t.Fatal("expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.wantRemain {
				t.Fatalf("got %d want %d", got, tt.wantRemain)
			}
		})
	}
}
