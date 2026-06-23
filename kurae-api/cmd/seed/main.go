package main

import (
	"context"
	"log"

	"github.com/kurae/kurae-api/internal/config"
	"github.com/kurae/kurae-api/internal/seed"
	"github.com/kurae/kurae-api/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()
	s, err := store.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer s.Close()

	if err := seed.Run(ctx, s); err != nil {
		log.Fatalf("seed: %v", err)
	}
	log.Println("seed complete")
}
