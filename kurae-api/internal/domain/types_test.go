package domain

import (
	"testing"
	"time"
)

func TestResolveDropStatus(t *testing.T) {
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	end := time.Date(2026, 1, 8, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name      string
		now       time.Time
		remaining int
		want      DropStatus
	}{
		{"upcoming", start.Add(-time.Hour), 10, DropStatusUpcoming},
		{"live", start.Add(time.Hour), 10, DropStatusLive},
		{"sold out", start.Add(time.Hour), 0, DropStatusSoldOut},
		{"expired", end.Add(time.Hour), 10, DropStatusExpired},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := ResolveDropStatus(start, end, tc.remaining, tc.now)
			if got != tc.want {
				t.Fatalf("got %s want %s", got, tc.want)
			}
		})
	}
}
