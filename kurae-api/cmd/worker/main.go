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

	var redisQueue *queue.RedisQueue
	if cfg.RedisURL != "" {
		redisQueue, err = queue.NewRedisQueue(cfg.RedisURL)
		if err != nil {
			log.Printf("redis: %v", err)
		} else {
			defer redisQueue.Close()
		}
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
			if err := emailSender.SendOrderConfirmation(ctx, job.OrderID, job.BuyerEmail, job.DropTitle); err != nil {
				log.Printf("send email: %v", err)
			}
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
			<-stop
			log.Println("kurae-worker stopped")
			return
		}
		log.Printf("dequeue email: %v", err)
	}
}
