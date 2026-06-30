package httpapi

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/kurae/kurae-api/internal/queue"
)

func TestEvaluateHealthAllOK(t *testing.T) {
	t.Parallel()

	report, code := evaluateHealth(
		context.Background(),
		func(context.Context) error { return nil },
		func(context.Context) error { return nil },
		true,
	)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if report.Status != "ok" {
		t.Fatalf("expected ok status, got %q", report.Status)
	}
	if report.Checks["postgres"] != "ok" || report.Checks["redis"] != "ok" {
		t.Fatalf("unexpected checks: %#v", report.Checks)
	}
}

func TestEvaluateHealthPostgresFailure(t *testing.T) {
	t.Parallel()

	report, code := evaluateHealth(
		context.Background(),
		func(context.Context) error { return errors.New("down") },
		func(context.Context) error { return nil },
		false,
	)
	if code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", code)
	}
	if report.Checks["postgres"] != "error" {
		t.Fatalf("expected postgres error, got %#v", report.Checks)
	}
}

func TestEvaluateHealthRedisSkippedInDevelopment(t *testing.T) {
	t.Parallel()

	report, code := evaluateHealth(
		context.Background(),
		func(context.Context) error { return nil },
		nil,
		false,
	)
	if code != http.StatusOK {
		t.Fatalf("expected 200, got %d", code)
	}
	if report.Checks["redis"] != "skipped" {
		t.Fatalf("expected redis skipped, got %#v", report.Checks)
	}
}

func TestEvaluateHealthRedisRequiredButMissing(t *testing.T) {
	t.Parallel()

	report, code := evaluateHealth(
		context.Background(),
		func(context.Context) error { return nil },
		func(context.Context) error { return queue.ErrQueueDisabled },
		true,
	)
	if code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", code)
	}
	if report.Checks["redis"] != "error" {
		t.Fatalf("expected redis error, got %#v", report.Checks)
	}
}
