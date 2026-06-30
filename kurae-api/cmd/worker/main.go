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

	orderSvc := service.NewOrderService(db, payments.NewNoopProvider(), nil, cfg.ReservationTTL, false)
	emailSender := jobs.NewEmailSender(cfg)

	redisQueue, err := connectRedisQueue(cfg)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	if redisQueue != nil {
		defer redisQueue.Close()
	}

	log.Println("kurae-worker started (reservation expiry + email queue)")

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
			processEmailJob(ctx, redisQueue, emailSender, job)
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

func processEmailJob(ctx context.Context, redisQueue *queue.RedisQueue, emailSender *jobs.EmailSender, job queue.EmailJob) {
	if err := emailSender.SendOrderConfirmation(ctx, job.OrderID, job.BuyerEmail, job.DropTitle); err != nil {
		log.Printf("send email order=%s attempt=%d: %v", job.OrderID, job.Attempt+1, err)
		if requeueErr := redisQueue.RequeueEmail(ctx, job, err.Error()); requeueErr != nil {
			log.Printf("requeue email order=%s: %v", job.OrderID, requeueErr)
		}
		return
	}
	if job.Attempt > 0 {
		log.Printf("send email order=%s succeeded on attempt %d", job.OrderID, job.Attempt+1)
	}
}
