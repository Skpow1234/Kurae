package httpapi

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/store"
)

type HealthReport struct {
	Status string            `json:"status"`
	Checks map[string]string `json:"checks"`
}

type HealthHandler struct {
	db           *store.Store
	redis        *queue.RedisQueue
	requireRedis bool
}

func NewHealthHandler(db *store.Store, redis *queue.RedisQueue, requireRedis bool) *HealthHandler {
	return &HealthHandler{
		db:           db,
		redis:        redis,
		requireRedis: requireRedis,
	}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	report, status := evaluateHealth(
		ctx,
		h.db.Ping,
		h.pingRedis,
		h.requireRedis,
	)
	writeJSON(w, status, report)
}

func (h *HealthHandler) pingRedis(ctx context.Context) error {
	if h.redis == nil {
		return queue.ErrQueueDisabled
	}
	return h.redis.Ping(ctx)
}

func evaluateHealth(
	ctx context.Context,
	pingPostgres func(context.Context) error,
	pingRedis func(context.Context) error,
	requireRedis bool,
) (HealthReport, int) {
	checks := map[string]string{}
	healthy := true

	if err := pingPostgres(ctx); err != nil {
		checks["postgres"] = "error"
		healthy = false
	} else {
		checks["postgres"] = "ok"
	}

	switch {
	case pingRedis != nil:
		if err := pingRedis(ctx); err != nil {
			if errors.Is(err, queue.ErrQueueDisabled) && !requireRedis {
				checks["redis"] = "skipped"
			} else {
				checks["redis"] = "error"
				healthy = false
			}
		} else {
			checks["redis"] = "ok"
		}
	case requireRedis:
		checks["redis"] = "error"
		healthy = false
	default:
		checks["redis"] = "skipped"
	}

	status := "ok"
	code := http.StatusOK
	if !healthy {
		status = "error"
		code = http.StatusServiceUnavailable
	}

	return HealthReport{Status: status, Checks: checks}, code
}
