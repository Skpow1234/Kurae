package store

import (
	"context"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
)

type AnalyticsQuery struct {
	SellerID string
	Days     int
	DropID   *string
	Now      time.Time
}

func (r *AnalyticsRepository) QuerySellerAnalytics(ctx context.Context, q AnalyticsQuery) (domain.SellerAnalytics, error) {
	return r.querySellerAnalytics(ctx, q)
}

func (r *AnalyticsRepository) querySellerAnalytics(ctx context.Context, q AnalyticsQuery) (domain.SellerAnalytics, error) {
	days := q.Days
	if days <= 0 {
		days = 7
	}

	currentStart := q.Now.Add(-time.Duration(days) * 24 * time.Hour)
	prevStart := q.Now.Add(-time.Duration(days*2) * 24 * time.Hour)

	var out domain.SellerAnalytics
	out.RangeDays = days
	out.PeriodStart = currentStart.UTC().Format("2006-01-02")
	out.PeriodEnd = q.Now.UTC().Format("2006-01-02")
	out.DropID = q.DropID

	err := r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE viewed_at >= $2)::int,
			COUNT(*) FILTER (WHERE viewed_at >= $3 AND viewed_at < $2)::int
		FROM drop_page_views
		WHERE seller_id = $1
		  AND ($4::uuid IS NULL OR drop_id = $4)
	`, q.SellerID, currentStart, prevStart, q.DropID).Scan(&out.PageViews7d, &out.PageViewsPrev7d)
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
		  AND ($4::uuid IS NULL OR we.drop_id = $4)
	`, q.SellerID, currentStart, prevStart, q.DropID).Scan(&out.WaitlistSignups7d, &out.WaitlistSignupsPrev7d)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	var paidCurrent, paidPrev int
	err = r.store.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped') AND created_at >= $2
			)::int,
			COUNT(*) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped') AND created_at >= $3 AND created_at < $2
			)::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped') AND created_at >= $2
			), 0)::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped') AND created_at >= $3 AND created_at < $2
			), 0)::int
		FROM orders
		WHERE seller_id = $1
		  AND ($4::uuid IS NULL OR drop_id = $4)
	`, q.SellerID, currentStart, prevStart, q.DropID).Scan(
		&paidCurrent, &paidPrev, &out.Revenue7dCents, &out.RevenuePrev7dCents,
	)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	out.ConversionRate = conversionRate(paidCurrent, out.PageViews7d)
	out.ConversionRatePrev = conversionRate(paidPrev, out.PageViewsPrev7d)

	var checkoutsCurrent int
	err = r.store.pool.QueryRow(ctx, `
		SELECT COUNT(*)::int FROM orders
		WHERE seller_id = $1
		  AND created_at >= $2
		  AND status NOT IN ('cancelled')
		  AND ($3::uuid IS NULL OR drop_id = $3)
	`, q.SellerID, currentStart, q.DropID).Scan(&checkoutsCurrent)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	out.Funnel = domain.AnalyticsFunnel{
		Views:     out.PageViews7d,
		Checkouts: checkoutsCurrent,
		Paid:      paidCurrent,
	}

	daily, err := r.dailyTraffic(ctx, q.SellerID, currentStart, q.Now, q.DropID)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}
	out.DailyTraffic = daily

	if q.DropID == nil {
		breakdown, err := r.dropBreakdown(ctx, q.SellerID, currentStart, q.Now)
		if err != nil {
			return domain.SellerAnalytics{}, err
		}
		out.DropBreakdown = breakdown
	}

	campaigns, err := r.campaignBreakdown(ctx, q.SellerID, currentStart, q.Now, q.DropID)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}
	if len(campaigns) > 0 {
		out.CampaignBreakdown = campaigns
	}

	return out, nil
}

func (r *AnalyticsRepository) dropBreakdown(
	ctx context.Context,
	sellerID string,
	start, end time.Time,
) ([]domain.DropAnalyticsRow, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT
			d.id,
			d.title,
			d.slug,
			COALESCE(v.views, 0)::int,
			COALESCE(w.waitlist, 0)::int,
			COALESCE(o.checkouts, 0)::int,
			COALESCE(o.paid, 0)::int,
			COALESCE(o.revenue, 0)::int
		FROM drops d
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS views
			FROM drop_page_views v
			WHERE v.drop_id = d.id AND v.viewed_at >= $2 AND v.viewed_at <= $3
		) v ON true
		LEFT JOIN LATERAL (
			SELECT COUNT(*)::int AS waitlist
			FROM waitlist_entries we
			WHERE we.drop_id = d.id AND we.created_at >= $2 AND we.created_at <= $3
		) w ON true
		LEFT JOIN LATERAL (
			SELECT
				COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int AS checkouts,
				COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled', 'shipped'))::int AS paid,
				COALESCE(SUM(amount_cents) FILTER (
					WHERE status IN ('paid', 'fulfilled', 'shipped')
				), 0)::int AS revenue
			FROM orders o
			WHERE o.drop_id = d.id AND o.created_at >= $2 AND o.created_at <= $3
		) o ON true
		WHERE d.seller_id = $1
		ORDER BY v.views DESC, d.created_at DESC
	`, sellerID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []domain.DropAnalyticsRow
	for rows.Next() {
		var row domain.DropAnalyticsRow
		if err := rows.Scan(
			&row.DropID, &row.DropTitle, &row.DropSlug,
			&row.Views, &row.WaitlistSignups, &row.Checkouts, &row.PaidOrders, &row.RevenueCents,
		); err != nil {
			return nil, err
		}
		row.ConversionRate = conversionRate(row.PaidOrders, row.Views)
		out = append(out, row)
	}
	return out, rows.Err()
}
