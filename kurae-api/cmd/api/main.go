package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/httpapi"
	"github.com/kurae/kurae-api/internal/queue"
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

	var redisQueue *queue.RedisQueue
	if cfg.RedisURL != "" {
		redisQueue, err = queue.NewRedisQueue(cfg.RedisURL)
		if err != nil {
			if cfg.IsProduction() {
				log.Fatalf("redis: %v", err)
			}
			log.Printf("redis: %v (email queue disabled)", err)
		} else {
			defer redisQueue.Close()
		}
	} else if cfg.IsProduction() {
		log.Fatalf("redis: REDIS_URL is required in production")
	}

	srv := httpapi.NewServer(cfg, db, redisQueue)
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("kurae-api listening on :%s (swagger: /swagger/)", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	fmt.Println("kurae-api stopped")
}
