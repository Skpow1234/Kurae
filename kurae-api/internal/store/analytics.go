package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

type AnalyticsRepository struct {
	store *Store
}

func (s *Store) Analytics() *AnalyticsRepository {
	return &AnalyticsRepository{store: s}
}

func (r *AnalyticsRepository) RecordView(ctx context.Context, dropID, sellerID string) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO drop_page_views (drop_id, seller_id)
		VALUES ($1, $2)
	`, dropID, sellerID)
	return err
}

func (r *AnalyticsRepository) GetSellerAnalytics(ctx context.Context, sellerID string, now time.Time) (domain.SellerAnalytics, error) {
	currentStart := now.Add(-7 * 24 * time.Hour)
	prevStart := now.Add(-14 * 24 * time.Hour)

	var out domain.SellerAnalytics

	err := r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE viewed_at >= $2)::int,
			COUNT(*) FILTER (WHERE viewed_at >= $3 AND viewed_at < $2)::int
		FROM drop_page_views
		WHERE seller_id = $1
	`, sellerID, currentStart, prevStart).Scan(&out.PageViews7d, &out.PageViewsPrev7d)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	err = r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE we.created_at >= $2)::int,
			COUNT(*) FILTER (WHERE we.created_at >= $3 AND we.created_at < $2)::int
		FROM waitlist_entries we
		JOIN drops d ON d.id = we.drop_id
		WHERE d.seller_id = $1
	`, sellerID, currentStart, prevStart).Scan(&out.WaitlistSignups7d, &out.WaitlistSignupsPrev7d)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	var paid7d, paidPrev int
	err = r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (
				WHERE status IN ('paid', 'fulfilled') AND created_at >= $2
			)::int,
			COUNT(*) FILTER (
				WHERE status IN ('paid', 'fulfilled') AND created_at >= $3 AND created_at < $2
			)::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled') AND created_at >= $2
			), 0)::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled') AND created_at >= $3 AND created_at < $2
			), 0)::int
		FROM orders
		WHERE seller_id = $1
	`, sellerID, currentStart, prevStart).Scan(&paid7d, &paidPrev, &out.Revenue7dCents, &out.RevenuePrev7dCents)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	out.ConversionRate = conversionRate(paid7d, out.PageViews7d)
	out.ConversionRatePrev = conversionRate(paidPrev, out.PageViewsPrev7d)

	var checkouts7d int
	err = r.store.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM orders
		WHERE seller_id = $1
		  AND created_at >= $2
		  AND status NOT IN ('cancelled')
	`, sellerID, currentStart).Scan(&checkouts7d)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	out.Funnel = domain.AnalyticsFunnel{
		Views:     out.PageViews7d,
		Checkouts: checkouts7d,
		Paid:      paid7d,
	}

	daily, err := r.dailyTraffic(ctx, sellerID, currentStart, now)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}
	out.DailyTraffic = daily

	return out, nil
}

func conversionRate(paid, views int) float64 {
	if views <= 0 {
		if paid > 0 {
			return 100
		}
		return 0
	}
	return float64(int(float64(paid)/float64(views)*1000+0.5)) / 10
}

func (r *AnalyticsRepository) dailyTraffic(ctx context.Context, sellerID string, start, end time.Time) ([]domain.DailyAnalyticsPoint, error) {
	rows, err := r.store.pool.Query(ctx, `
		WITH days AS (
			SELECT generate_series(
				date_trunc('day', $2::timestamptz),
				date_trunc('day', $3::timestamptz),
				interval '1 day'
			) AS day
		),
		views AS (
			SELECT date_trunc('day', viewed_at) AS day, COUNT(*)::int AS cnt
			FROM drop_page_views
			WHERE seller_id = $1 AND viewed_at >= $2 AND viewed_at <= $3
			GROUP BY 1
		),
		orders AS (
			SELECT date_trunc('day', created_at) AS day,
				COUNT(*)::int AS cnt,
				COALESCE(SUM(amount_cents) FILTER (
					WHERE status IN ('paid', 'fulfilled')
				), 0)::int AS revenue
			FROM orders
			WHERE seller_id = $1 AND created_at >= $2 AND created_at <= $3
			GROUP BY 1
		)
		SELECT d.day,
			COALESCE(v.cnt, 0),
			COALESCE(o.cnt, 0),
			COALESCE(o.revenue, 0)
		FROM days d
		LEFT JOIN views v ON v.day = d.day
		LEFT JOIN orders o ON o.day = d.day
		ORDER BY d.day
	`, sellerID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.DailyAnalyticsPoint
	for rows.Next() {
		var day time.Time
		var p domain.DailyAnalyticsPoint
		if err := rows.Scan(&day, &p.Views, &p.Orders, &p.RevenueCents); err != nil {
			return nil, err
		}
		p.Date = day.UTC().Format("2006-01-02")
		points = append(points, p)
	}
	return points, rows.Err()
}

func (r *AnalyticsRepository) LookupDropSeller(ctx context.Context, dropID string) (string, error) {
	var sellerID string
	err := r.store.pool.QueryRow(ctx, `
		SELECT seller_id FROM drops WHERE id = $1
	`, dropID).Scan(&sellerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return sellerID, err
}
