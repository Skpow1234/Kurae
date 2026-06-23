package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: migrate [up|down]")
	}
	dir := "migrations"
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		dir = filepath.Join("..", "..", "migrations")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	conn, err := pgx.Connect(ctx, databaseURL)
	if err != nil {
		log.Fatalf("connect: %v", err)
	}
	defer conn.Close(ctx)

	switch os.Args[1] {
	case "up":
		if err := runMigrations(ctx, conn, dir, true); err != nil {
			log.Fatal(err)
		}
		fmt.Println("migrations applied")
	case "down":
		if err := runMigrations(ctx, conn, dir, false); err != nil {
			log.Fatal(err)
		}
		fmt.Println("migrations rolled back")
	default:
		log.Fatal("usage: migrate [up|down]")
	}
}

func runMigrations(ctx context.Context, conn *pgx.Conn, dir string, up bool) error {
	_, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	if err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if up && strings.HasSuffix(name, ".up.sql") {
			files = append(files, name)
		}
		if !up && strings.HasSuffix(name, ".down.sql") {
			files = append(files, name)
		}
	}
	sort.Strings(files)
	if !up {
		sort.Sort(sort.Reverse(sort.StringSlice(files)))
	}

	for _, name := range files {
		version := strings.TrimSuffix(strings.TrimSuffix(name, ".up.sql"), ".down.sql")
		if up {
			var exists bool
			if err := conn.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, version).Scan(&exists); err != nil {
				return err
			}
			if exists {
				continue
			}
		}

		sqlBytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return err
		}
		if _, err := conn.Exec(ctx, string(sqlBytes)); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}

		if up {
			if _, err := conn.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version); err != nil {
				return err
			}
		} else {
			if _, err := conn.Exec(ctx, `DELETE FROM schema_migrations WHERE version = $1`, version); err != nil {
				return err
			}
		}
	}
	return nil
}
