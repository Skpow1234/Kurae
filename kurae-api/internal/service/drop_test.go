package service

import (
	"testing"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
)

func TestNormalizePublishStatus(t *testing.T) {
	now := time.Date(2026, 6, 23, 12, 0, 0, 0, time.UTC)
	future := now.Add(2 * time.Hour)
	past := now.Add(-2 * time.Hour)

	tests := []struct {
		name   string
		status domain.PublishStatus
		start  time.Time
		want   domain.PublishStatus
	}{
		{"draft stays draft", domain.PublishDraft, future, domain.PublishDraft},
		{"published stays published", domain.PublishPublished, future, domain.PublishPublished},
		{"scheduled future stays scheduled", domain.PublishScheduled, future, domain.PublishScheduled},
		{"scheduled past publishes now", domain.PublishScheduled, past, domain.PublishPublished},
		{"scheduled at start publishes now", domain.PublishScheduled, now, domain.PublishPublished},
		{"unknown status becomes draft", domain.PublishStatus("pending"), future, domain.PublishDraft},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizePublishStatus(tt.status, tt.start, now)
			if got != tt.want {
				t.Fatalf("normalizePublishStatus(%q, %v) = %q, want %q", tt.status, tt.start, got, tt.want)
			}
		})
	}
}
