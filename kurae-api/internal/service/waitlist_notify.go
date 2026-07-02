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
	drops    *store.DropRepository
	waitlist *store.WaitlistRepository
	queue    *queue.RedisQueue
	webURL   string
}

func NewWaitlistNotifyService(s *store.Store, q *queue.RedisQueue, webURL string) *WaitlistNotifyService {
	return &WaitlistNotifyService{
		drops:    s.Drops(),
		waitlist: s.Waitlist(),
		queue:    q,
		webURL:   strings.TrimRight(strings.TrimSpace(webURL), "/"),
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

	var send func(context.Context, string, string, string) error
	switch job.Type {
	case queue.EmailTypeWaitlistLive:
		send = sender.SendWaitlistLive
	case queue.EmailTypeWaitlistRestock:
		send = sender.SendWaitlistRestock
	default:
		return fmt.Errorf("unsupported waitlist job type %q", job.Type)
	}

	var firstErr error
	for _, email := range emails {
		if err := send(ctx, email, job.DropTitle, job.DropURL); err != nil {
			log.Printf("waitlist email drop=%s to=%s: %v", job.DropID, email, err)
			firstErr = err
		}
	}
	return firstErr
}
