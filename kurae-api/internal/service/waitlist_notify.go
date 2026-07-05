package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/jobs"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/store"
)

type WaitlistNotifyService struct {
	drops          *store.DropRepository
	waitlist       *store.WaitlistRepository
	queue          *queue.RedisQueue
	webURL         string
	soonNotifyLead time.Duration
}

func NewWaitlistNotifyService(
	s *store.Store,
	q *queue.RedisQueue,
	webURL string,
	soonNotifyLead time.Duration,
) *WaitlistNotifyService {
	if soonNotifyLead <= 0 {
		soonNotifyLead = 24 * time.Hour
	}
	return &WaitlistNotifyService{
		drops:          s.Drops(),
		waitlist:       s.Waitlist(),
		queue:          q,
		webURL:         strings.TrimRight(strings.TrimSpace(webURL), "/"),
		soonNotifyLead: soonNotifyLead,
	}
}

func (w *WaitlistNotifyService) dropURL(sellerSlug, dropSlug string) string {
	return fmt.Sprintf("%s/%s/%s", w.webURL, sellerSlug, dropSlug)
}

func (w *WaitlistNotifyService) NotifyRestock(ctx context.Context, dropID string) error {
	if w == nil || w.queue == nil {
		return nil
	}

	drop, err := w.drops.GetByID(ctx, dropID)
	if err != nil {
		return err
	}
	if drop.WaitlistCount == 0 || drop.PublishStatus != domain.PublishPublished {
		return nil
	}
	if time.Now().After(drop.EndsAt) {
		return nil
	}

	return w.queue.EnqueueEmail(ctx, queue.EmailJob{
		Type:      queue.EmailTypeWaitlistRestock,
		DropID:    drop.ID,
		DropTitle: drop.Title,
		DropURL:   w.dropURL(drop.SellerSlug, drop.Slug),
	})
}

func (w *WaitlistNotifyService) ProcessDueSoonNotifications(ctx context.Context) (int, error) {
	if w == nil || w.queue == nil {
		return 0, nil
	}

	now := time.Now()
	due, err := w.drops.ListDueSoonWaitlistNotifications(ctx, now, w.soonNotifyLead)
	if err != nil {
		return 0, err
	}

	var enqueued int
	for _, drop := range due {
		claimed, err := w.drops.MarkSoonWaitlistNotified(ctx, drop.ID)
		if err != nil {
			return enqueued, err
		}
		if !claimed {
			continue
		}

		if err := w.queue.EnqueueEmail(ctx, queue.EmailJob{
			Type:         queue.EmailTypeWaitlistSoon,
			DropID:       drop.ID,
			DropTitle:    drop.Title,
			DropURL:      w.dropURL(drop.SellerSlug, drop.Slug),
			DropStartsAt: drop.StartsAt.UTC().Format(time.RFC3339),
		}); err != nil {
			log.Printf("enqueue waitlist soon drop=%s: %v", drop.ID, err)
			continue
		}
		enqueued++
	}
	return enqueued, nil
}

func (w *WaitlistNotifyService) ProcessDueLiveNotifications(ctx context.Context) (int, error) {
	if w == nil || w.queue == nil {
		return 0, nil
	}

	now := time.Now()
	due, err := w.drops.ListDueLiveWaitlistNotifications(ctx, now)
	if err != nil {
		return 0, err
	}

	var enqueued int
	for _, drop := range due {
		claimed, err := w.drops.MarkLiveWaitlistNotified(ctx, drop.ID)
		if err != nil {
			return enqueued, err
		}
		if !claimed {
			continue
		}

		if err := w.queue.EnqueueEmail(ctx, queue.EmailJob{
			Type:      queue.EmailTypeWaitlistLive,
			DropID:    drop.ID,
			DropTitle: drop.Title,
			DropURL:   w.dropURL(drop.SellerSlug, drop.Slug),
		}); err != nil {
			log.Printf("enqueue waitlist live drop=%s: %v", drop.ID, err)
			continue
		}
		enqueued++
	}
	return enqueued, nil
}

func (w *WaitlistNotifyService) ProcessEmailJob(ctx context.Context, job queue.EmailJob, sender *jobs.EmailSender) error {
	if w == nil {
		return fmt.Errorf("waitlist notify service not configured")
	}
	if job.DropID == "" {
		return fmt.Errorf("waitlist job missing drop id")
	}

	emails, err := w.waitlist.ListEmailsByDrop(ctx, job.DropID)
	if err != nil {
		return err
	}
	if len(emails) == 0 {
		return nil
	}

	var firstErr error
	for _, email := range emails {
		var err error
		switch job.Type {
		case queue.EmailTypeWaitlistLive:
			err = sender.SendWaitlistLive(ctx, email, job.DropTitle, job.DropURL)
		case queue.EmailTypeWaitlistSoon:
			startsAt, parseErr := time.Parse(time.RFC3339, job.DropStartsAt)
			if parseErr != nil {
				return fmt.Errorf("waitlist soon job missing starts at: %w", parseErr)
			}
			err = sender.SendWaitlistSoon(ctx, email, job.DropTitle, job.DropURL, startsAt)
		case queue.EmailTypeWaitlistRestock:
			err = sender.SendWaitlistRestock(ctx, email, job.DropTitle, job.DropURL)
		default:
			return fmt.Errorf("unsupported waitlist job type %q", job.Type)
		}
		if err != nil {
			log.Printf("waitlist email drop=%s to=%s: %v", job.DropID, email, err)
			firstErr = err
		}
	}
	return firstErr
}
