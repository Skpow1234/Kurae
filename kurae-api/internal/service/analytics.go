package service

import (
	"context"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

type AnalyticsService struct {
	analytics *store.AnalyticsRepository
}

func NewAnalyticsService(s *store.Store) *AnalyticsService {
	return &AnalyticsService{analytics: s.Analytics()}
}

func (a *AnalyticsService) RecordView(ctx context.Context, dropID string) error {
	sellerID, err := a.analytics.LookupDropSeller(ctx, dropID)
	if err != nil {
		return err
	}
	return a.analytics.RecordView(ctx, dropID, sellerID)
}

func (a *AnalyticsService) GetForSeller(ctx context.Context, sellerID string) (domain.SellerAnalytics, error) {
	return a.analytics.GetSellerAnalytics(ctx, sellerID, time.Now())
}
