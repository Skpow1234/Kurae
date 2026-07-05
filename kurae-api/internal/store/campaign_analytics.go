package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kurae/kurae-api/internal/domain"
)

func (r *AnalyticsRepository) LookupSellerIDBySlug(ctx context.Context, slug string) (string, error) {
	var sellerID string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id FROM sellers WHERE slug = $1
	`, slug).Scan(&sellerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return sellerID, err
}

func (r *AnalyticsRepository) LookupDropForSeller(ctx context.Context, dropID, sellerID string) error {
	var id string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id FROM drops WHERE id = $1 AND seller_id = $2
	`, dropID, sellerID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (r *AnalyticsRepository) RecordCampaignTouchpoint(
	ctx context.Context,
	sellerID string,
	dropID *string,
	campaign domain.CampaignAttribution,
) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO campaign_touchpoints (
			seller_id, drop_id, utm_source, utm_medium, utm_campaign, utm_term, utm_content
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, sellerID, dropID, campaign.Source, campaign.Medium, campaign.Campaign, campaign.Term, campaign.Content)
	return err
}

func campaignKey(source, medium, campaign string) string {
	return source + "\x00" + medium + "\x00" + campaign
}

func displayCampaignValue(value string) string {
	if value == "" {
		return "(none)"
	}
	return value
}

func (r *AnalyticsRepository) campaignBreakdown(
	ctx context.Context,
	sellerID string,
	start, end time.Time,
	dropID *string,
) ([]domain.CampaignAnalyticsRow, error) {
	visitRows, err := r.store.pool.Query(ctx, `
		SELECT utm_source, utm_medium, utm_campaign, COUNT(*)::int
		FROM campaign_touchpoints
		WHERE seller_id = $1
		  AND touched_at >= $2 AND touched_at <= $3
		  AND ($4::uuid IS NULL OR drop_id = $4)
		GROUP BY utm_source, utm_medium, utm_campaign
	`, sellerID, start, end, dropID)
	if err != nil {
		return nil, err
	}
	defer visitRows.Close()

	type agg struct {
		domain.CampaignAnalyticsRow
	}
	merged := map[string]*agg{}

	for visitRows.Next() {
		var source, medium, campaign string
		var visits int
		if err := visitRows.Scan(&source, &medium, &campaign, &visits); err != nil {
			return nil, err
		}
		key := campaignKey(source, medium, campaign)
		merged[key] = &agg{
			CampaignAnalyticsRow: domain.CampaignAnalyticsRow{
				Source:   displayCampaignValue(source),
				Medium:   displayCampaignValue(medium),
				Campaign: displayCampaignValue(campaign),
				Visits:   visits,
			},
		}
	}
	if err := visitRows.Err(); err != nil {
		return nil, err
	}

	orderRows, err := r.store.pool.Query(ctx, `
		SELECT
			utm_source,
			utm_medium,
			utm_campaign,
			COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))::int,
			COUNT(*) FILTER (WHERE status IN ('paid', 'fulfilled', 'shipped'))::int,
			COALESCE(SUM(amount_cents) FILTER (
				WHERE status IN ('paid', 'fulfilled', 'shipped')
			), 0)::int
		FROM orders
		WHERE seller_id = $1
		  AND created_at >= $2 AND created_at <= $3
		  AND ($4::uuid IS NULL OR drop_id = $4)
		  AND (utm_source <> '' OR utm_medium <> '' OR utm_campaign <> '' OR utm_term <> '' OR utm_content <> '')
		GROUP BY utm_source, utm_medium, utm_campaign
	`, sellerID, start, end, dropID)
	if err != nil {
		return nil, err
	}
	defer orderRows.Close()

	for orderRows.Next() {
		var source, medium, campaign string
		var checkouts, paid, revenue int
		if err := orderRows.Scan(&source, &medium, &campaign, &checkouts, &paid, &revenue); err != nil {
			return nil, err
		}
		key := campaignKey(source, medium, campaign)
		row, ok := merged[key]
		if !ok {
			row = &agg{
				CampaignAnalyticsRow: domain.CampaignAnalyticsRow{
					Source:   displayCampaignValue(source),
					Medium:   displayCampaignValue(medium),
					Campaign: displayCampaignValue(campaign),
				},
			}
			merged[key] = row
		}
		row.Checkouts = checkouts
		row.PaidOrders = paid
		row.RevenueCents = revenue
	}
	if err := orderRows.Err(); err != nil {
		return nil, err
	}

	out := make([]domain.CampaignAnalyticsRow, 0, len(merged))
	for _, row := range merged {
		row.ConversionRate = conversionRate(row.PaidOrders, row.Visits)
		out = append(out, row.CampaignAnalyticsRow)
	}

	sortCampaignRows(out)
	return out, nil
}

func sortCampaignRows(rows []domain.CampaignAnalyticsRow) {
	for i := 0; i < len(rows); i++ {
		for j := i + 1; j < len(rows); j++ {
			if rows[j].Visits > rows[i].Visits ||
				(rows[j].Visits == rows[i].Visits && rows[j].PaidOrders > rows[i].PaidOrders) {
				rows[i], rows[j] = rows[j], rows[i]
			}
		}
	}
}
