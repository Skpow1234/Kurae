package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/payments"
	"github.com/kurae/kurae-api/internal/service"
	"github.com/kurae/kurae-api/internal/store"
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

	orderSvc := service.NewOrderService(db, payments.NewNoopProvider(), cfg.ReservationTTL)
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	log.Println("kurae-worker started (reservation expiry)")

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			n, err := orderSvc.ExpireReservations(ctx)
			if err != nil {
				log.Printf("expire reservations: %v", err)
				continue
			}
			if n > 0 {
				log.Printf("expired %d reservations", n)
			}
		case <-stop:
			log.Println("kurae-worker stopped")
			return
		}
	}
}
