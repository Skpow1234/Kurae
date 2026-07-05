package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/jobs"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/queue"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
	"github.com/redis/go-redis/v9"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	db, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	redisQueue, err := connectRedisQueue(cfg)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	if redisQueue != nil {
		defer redisQueue.Close()
	}

	waitlistNotify := service.NewWaitlistNotifyService(db, redisQueue, cfg.PublicWebURL, cfg.WaitlistSoonNotifyBefore)
	inventoryAlerts := service.NewInventoryAlertService(db, redisQueue, cfg.PublicWebURL)
	orderSvc := service.NewOrderService(db, payments.NewNoopProvider(), redisQueue, cfg.ReservationTTL, false, waitlistNotify, inventoryAlerts)
	dropSvc := service.NewDropService(db, waitlistNotify, inventoryAlerts)
	emailSender := jobs.NewEmailSender(cfg)

	log.Println("kurae-worker started (reservation expiry + scheduled publish + waitlist notify + email queue)")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				n, err := orderSvc.ExpireReservations(ctx)
				if err != nil {
					log.Printf("expire reservations: %v", err)
				} else if n > 0 {
					log.Printf("expired %d reservations", n)
				}
				published, err := dropSvc.PublishDueScheduled(ctx)
				if err != nil {
					log.Printf("publish scheduled drops: %v", err)
				} else if published > 0 {
					log.Printf("published %d scheduled drops", published)
				}
				soonNotified, err := waitlistNotify.ProcessDueSoonNotifications(ctx)
				if err != nil {
					log.Printf("waitlist soon notifications: %v", err)
				} else if soonNotified > 0 {
					log.Printf("enqueued waitlist soon notifications for %d drops", soonNotified)
				}
				notified, err := waitlistNotify.ProcessDueLiveNotifications(ctx)
				if err != nil {
					log.Printf("waitlist live notifications: %v", err)
				} else if notified > 0 {
					log.Printf("enqueued waitlist live notifications for %d drops", notified)
				}
			case <-stop:
				return
			}
		}
	}()

	for {
		if redisQueue == nil {
			select {
			case <-stop:
				log.Println("kurae-worker stopped")
				return
			case <-time.After(time.Second):
			}
			continue
		}

		job, err := redisQueue.DequeueEmail(ctx, 5*time.Second)
		if err == nil {
			processEmailJob(ctx, redisQueue, emailSender, waitlistNotify, inventoryAlerts, job)
			continue
		}
		if errors.Is(err, redis.Nil) {
			select {
			case <-stop:
				log.Println("kurae-worker stopped")
				return
			default:
			}
			continue
		}
		if errors.Is(err, queue.ErrQueueDisabled) {
			log.Fatalf("redis: email queue disabled")
		}
		log.Printf("dequeue email: %v", err)
	}
}

func connectRedisQueue(cfg config.Config) (*queue.RedisQueue, error) {
	if cfg.RedisURL == "" {
		if cfg.IsProduction() {
			return nil, errors.New("REDIS_URL is required in production")
		}
		log.Println("redis: not configured (email queue disabled in development)")
		return nil, nil
	}

	redisQueue, err := queue.NewRedisQueue(cfg.RedisURL)
	if err != nil {
		if cfg.IsProduction() {
			return nil, err
		}
		log.Printf("redis: %v (email queue disabled)", err)
		return nil, nil
	}
	return redisQueue, nil
}

func processEmailJob(
	ctx context.Context,
	redisQueue *queue.RedisQueue,
	emailSender *jobs.EmailSender,
	waitlistNotify *service.WaitlistNotifyService,
	inventoryAlerts *service.InventoryAlertService,
	job queue.EmailJob,
) {
	jobType := job.Type
	if jobType == "" {
		jobType = queue.EmailTypeOrderConfirmation
	}

	var err error
	switch jobType {
	case queue.EmailTypeWaitlistLive, queue.EmailTypeWaitlistSoon, queue.EmailTypeWaitlistRestock:
		err = waitlistNotify.ProcessEmailJob(ctx, job, emailSender)
	case queue.EmailTypeInventoryLow:
		err = inventoryAlerts.ProcessEmailJob(ctx, job, emailSender)
	default:
		err = emailSender.SendOrderConfirmation(ctx, job.OrderID, job.BuyerEmail, job.DropTitle)
	}
	if err != nil {
		ref := job.OrderID
		if ref == "" {
			ref = job.DropID
		}
		log.Printf("send email type=%s ref=%s attempt=%d: %v", jobType, ref, job.Attempt+1, err)
		if requeueErr := redisQueue.RequeueEmail(ctx, job, err.Error()); requeueErr != nil {
			log.Printf("requeue email type=%s ref=%s: %v", jobType, ref, requeueErr)
		}
		return
	}
	if job.Attempt > 0 {
		ref := job.OrderID
		if ref == "" {
			ref = job.DropID
		}
		log.Printf("send email type=%s ref=%s succeeded on attempt %d", jobType, ref, job.Attempt+1)
	}
}
