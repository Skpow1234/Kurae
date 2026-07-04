package store

import (
	"context"

	"github.com/kurae/kurae-api/internal/domain"
)

func (r *OrderRepository) DashboardStats(ctx context.Context, sellerID string) (domain.DashboardStats, error) {
	var stats domain.DashboardStats
	err := r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled', 'shipped'))::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped')
				AND created_at > now() - interval '7 days'
			), 0)::int
		FROM orders
		WHERE seller_id = $1
	`, sellerID).Scan(&stats.OrderCount, &stats.PaidCount, &stats.Revenue7dCents)
	if err != nil {
		return domain.DashboardStats{}, err
	}

	err = r.store.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(waitlist_count), 0)::int
		FROM drops
		WHERE seller_id = $1
	`, sellerID).Scan(&stats.WaitlistTotal)
	if err != nil {
		return domain.DashboardStats{}, err
	}

	return stats, nil
}
