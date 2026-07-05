package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/jobs"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/store"
)

const (
	inventoryAlertLevel5  = "5"
	inventoryAlertLevel20 = "20"
)

type InventoryAlertService struct {
	drops   *store.DropRepository
	sellers *store.SellerRepository
	queue   *queue.RedisQueue
	webURL  string
}

func NewInventoryAlertService(s *store.Store, q *queue.RedisQueue, webURL string) *InventoryAlertService {
	return &InventoryAlertService{
		drops:   s.Drops(),
		sellers: s.Sellers(),
		queue:   q,
		webURL:  strings.TrimRight(strings.TrimSpace(webURL), "/"),
	}
}

func (s *InventoryAlertService) dashboardDropURL(dropID string) string {
	return fmt.Sprintf("%s/dashboard/drops/%s", s.webURL, dropID)
}

func (s *InventoryAlertService) CheckDrop(ctx context.Context, dropID string) error {
	if s == nil || s.queue == nil {
		return nil
	}

	drop, err := s.drops.GetByID(ctx, dropID)
	if err != nil {
		return err
	}

	if err := s.drops.ResetInventoryAlertFlags(ctx, dropID, drop.InventoryRemaining, drop.InventoryTotal); err != nil {
		return err
	}

	if drop.PublishStatus != domain.PublishPublished {
		return nil
	}

	seller, err := s.sellers.GetByID(ctx, drop.SellerID)
	if err != nil {
		return err
	}

	if claimed, err := s.drops.ClaimInventoryAlert20(ctx, dropID); err != nil {
		return err
	} else if claimed {
		if err := s.enqueueAlert(ctx, drop, seller.Email, inventoryAlertLevel20); err != nil {
			log.Printf("enqueue inventory 20%% alert drop=%s: %v", dropID, err)
		}
	}

	if claimed, err := s.drops.ClaimInventoryAlert5(ctx, dropID); err != nil {
		return err
	} else if claimed {
		if err := s.enqueueAlert(ctx, drop, seller.Email, inventoryAlertLevel5); err != nil {
			log.Printf("enqueue inventory 5 alert drop=%s: %v", dropID, err)
		}
	}

	return nil
}

func (s *InventoryAlertService) enqueueAlert(
	ctx context.Context,
	drop domain.DropRecord,
	sellerEmail, level string,
) error {
	return s.queue.EnqueueEmail(ctx, queue.EmailJob{
		Type:                queue.EmailTypeInventoryLow,
		DropID:              drop.ID,
		DropTitle:           drop.Title,
		SellerEmail:         sellerEmail,
		InventoryRemaining:  drop.InventoryRemaining,
		InventoryTotal:      drop.InventoryTotal,
		InventoryAlertLevel: level,
		DashboardURL:        s.dashboardDropURL(drop.ID),
	})
}

func (s *InventoryAlertService) ProcessEmailJob(ctx context.Context, job queue.EmailJob, sender *jobs.EmailSender) error {
	if s == nil {
		return fmt.Errorf("inventory alert service not configured")
	}
	if job.SellerEmail == "" {
		return fmt.Errorf("inventory alert job missing seller email")
	}
	if job.DropTitle == "" {
		return fmt.Errorf("inventory alert job missing drop title")
	}

	switch job.InventoryAlertLevel {
	case inventoryAlertLevel5:
		return sender.SendInventoryLowUnits(
			ctx,
			job.SellerEmail,
			job.DropTitle,
			job.InventoryRemaining,
			job.InventoryTotal,
			job.DashboardURL,
		)
	case inventoryAlertLevel20:
		return sender.SendInventoryLowPercent(
			ctx,
			job.SellerEmail,
			job.DropTitle,
			job.InventoryRemaining,
			job.InventoryTotal,
			job.DashboardURL,
		)
	default:
		return fmt.Errorf("unsupported inventory alert level %q", job.InventoryAlertLevel)
	}
}
