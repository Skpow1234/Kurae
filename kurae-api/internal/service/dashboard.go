package service

import (
	"context"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

type DashboardService struct {
	orders *store.OrderRepository
}

func NewDashboardService(s *store.Store) *DashboardService {
	return &DashboardService{orders: s.Orders()}
}

func (d *DashboardService) Stats(ctx context.Context, sellerID string) (domain.DashboardStats, error) {
	return d.orders.DashboardStats(ctx, sellerID)
}
