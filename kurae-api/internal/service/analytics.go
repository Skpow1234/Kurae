package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/kurae/kurae-api/internal/validate"
)

var ErrInvalidAnalyticsRange = errors.New("days must be 7, 30, or 90")

type AnalyticsService struct {
	analytics *store.AnalyticsRepository
	drops     *store.DropRepository
}

func NewAnalyticsService(s *store.Store) *AnalyticsService {
	return &AnalyticsService{
		analytics: s.Analytics(),
		drops:     s.Drops(),
	}
}

type AnalyticsRequest struct {
	SellerID string
	Days     int
	DropID   *string
}

func (a *AnalyticsService) RecordView(ctx context.Context, dropID string) error {
	sellerID, err := a.analytics.LookupDropSeller(ctx, dropID)
	if err != nil {
		return err
	}
	return a.analytics.RecordView(ctx, dropID, sellerID)
}

type RecordTouchRequest struct {
	SellerSlug string
	DropID     string
	Campaign   domain.CampaignAttribution
}

func normalizeCampaignAttribution(c domain.CampaignAttribution) domain.CampaignAttribution {
	return validate.NormalizeCampaign(c)
}

func (a *AnalyticsService) RecordTouch(ctx context.Context, req RecordTouchRequest) error {
	sellerSlug := strings.TrimSpace(req.SellerSlug)
	if sellerSlug == "" {
		return errors.New("sellerSlug is required")
	}

	sellerID, err := a.analytics.LookupSellerIDBySlug(ctx, sellerSlug)
	if err != nil {
		return err
	}

	campaign := normalizeCampaignAttribution(req.Campaign)
	dropID := strings.TrimSpace(req.DropID)

	if dropID != "" {
		if err := a.analytics.LookupDropForSeller(ctx, dropID, sellerID); err != nil {
			return err
		}
		if err := a.analytics.RecordView(ctx, dropID, sellerID); err != nil {
			return err
		}
	}

	if !campaign.HasTracking() {
		if dropID == "" {
			return errors.New("dropId or campaign params required")
		}
		return nil
	}

	var dropPtr *string
	if dropID != "" {
		dropPtr = &dropID
	}
	return a.analytics.RecordCampaignTouchpoint(ctx, sellerID, dropPtr, campaign)
}

func (a *AnalyticsService) GetForSeller(ctx context.Context, req AnalyticsRequest) (domain.SellerAnalytics, error) {
	days, err := normalizeAnalyticsDays(req.Days)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	dropID, err := a.normalizeDropFilter(ctx, req.SellerID, req.DropID)
	if err != nil {
		return domain.SellerAnalytics{}, err
	}

	return a.analytics.QuerySellerAnalytics(ctx, store.AnalyticsQuery{
		SellerID: req.SellerID,
		Days:     days,
		DropID:   dropID,
		Now:      time.Now(),
	})
}

func (a *AnalyticsService) ExportCSV(ctx context.Context, req AnalyticsRequest, format string) ([]byte, string, error) {
	data, err := a.GetForSeller(ctx, req)
	if err != nil {
		return nil, "", err
	}

	switch strings.ToLower(strings.TrimSpace(format)) {
	case "drops":
		return exportDropBreakdownCSV(data), "drop-breakdown.csv", nil
	case "campaigns":
		return exportCampaignBreakdownCSV(data), "campaign-breakdown.csv", nil
	default:
		return exportDailyTrafficCSV(data), "daily-traffic.csv", nil
	}
}

func normalizeAnalyticsDays(days int) (int, error) {
	switch days {
	case 7, 30, 90:
		return days, nil
	case 0:
		return 7, nil
	default:
		return 0, ErrInvalidAnalyticsRange
	}
}

func (a *AnalyticsService) normalizeDropFilter(ctx context.Context, sellerID string, dropID *string) (*string, error) {
	if dropID == nil || strings.TrimSpace(*dropID) == "" {
		return nil, nil
	}
	id := strings.TrimSpace(*dropID)
	if _, err := a.drops.GetByIDForSeller(ctx, id, sellerID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, errors.New("drop not found")
		}
		return nil, err
	}
	return &id, nil
}

func exportDailyTrafficCSV(data domain.SellerAnalytics) []byte {
	var b strings.Builder
	b.WriteString("date,views,orders,revenue_cents\n")
	for _, row := range data.DailyTraffic {
		b.WriteString(row.Date)
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Views))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Orders))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.RevenueCents))
		b.WriteByte('\n')
	}
	return []byte(b.String())
}

func exportDropBreakdownCSV(data domain.SellerAnalytics) []byte {
	var b strings.Builder
	b.WriteString("drop_title,drop_slug,views,waitlist_signups,checkouts,paid_orders,revenue_cents,conversion_rate\n")
	for _, row := range data.DropBreakdown {
		b.WriteString(csvCell(row.DropTitle))
		b.WriteByte(',')
		b.WriteString(csvCell(row.DropSlug))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Views))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.WaitlistSignups))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Checkouts))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.PaidOrders))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.RevenueCents))
		b.WriteByte(',')
		b.WriteString(fmt.Sprintf("%.1f", row.ConversionRate))
		b.WriteByte('\n')
	}
	return []byte(b.String())
}

func exportCampaignBreakdownCSV(data domain.SellerAnalytics) []byte {
	var b strings.Builder
	b.WriteString("source,medium,campaign,visits,checkouts,paid_orders,revenue_cents,conversion_rate\n")
	for _, row := range data.CampaignBreakdown {
		b.WriteString(csvCell(row.Source))
		b.WriteByte(',')
		b.WriteString(csvCell(row.Medium))
		b.WriteByte(',')
		b.WriteString(csvCell(row.Campaign))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Visits))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.Checkouts))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.PaidOrders))
		b.WriteByte(',')
		b.WriteString(strconv.Itoa(row.RevenueCents))
		b.WriteByte(',')
		b.WriteString(fmt.Sprintf("%.1f", row.ConversionRate))
		b.WriteByte('\n')
	}
	return []byte(b.String())
}

func csvCell(value string) string {
	if strings.ContainsAny(value, ",\"\n\r") {
		return `"` + strings.ReplaceAll(value, `"`, `""`) + `"`
	}
	return value
}
