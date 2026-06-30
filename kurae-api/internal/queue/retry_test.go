package queue

import "testing"

func TestEmailRetryDelay(t *testing.T) {
	t.Parallel()

	tests := []struct {
		attempt int
		want    string
	}{
		{0, "30s"},
		{1, "30s"},
		{2, "2m0s"},
		{3, "10m0s"},
		{5, "1h0m0s"},
		{10, "1h0m0s"},
	}
	for _, tc := range tests {
		got := EmailRetryDelay(tc.attempt)
		if got.String() != tc.want {
			t.Fatalf("attempt %d: expected %s, got %s", tc.attempt, tc.want, got)
		}
	}
}

func TestMaxEmailAttempts(t *testing.T) {
	t.Parallel()
	if MaxEmailAttempts != 5 {
		t.Fatalf("expected 5 attempts, got %d", MaxEmailAttempts)
	}
}
