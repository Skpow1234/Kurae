package store_test

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
)

func TestMain(m *testing.M) {
	if os.Getenv("DATABASE_URL") != "" {
		if err := applyMigrations(); err != nil {
			fmt.Fprintf(os.Stderr, "store tests: migrations: %v\n", err)
			os.Exit(1)
		}
	}
	os.Exit(m.Run())
}

func applyMigrations() error {
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

  migrationsDir := migrationsDir()
  return runMigrationsUp(ctx, conn, migrationsDir)
}

func migrationsDir() string {
	dir := "migrations"
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		dir = filepath.Join("..", "..", "migrations")
	}
	return dir
}

func runMigrationsUp(ctx context.Context, conn *pgx.Conn, dir string) error {
	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return err
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	var files []string
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		files = append(files, name)
	}
	sort.Strings(files)

	for _, name := range files {
		version := strings.TrimSuffix(name, ".up.sql")

		var exists bool
		if err := conn.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`,
			version,
		).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}

		sqlBytes, err := os.ReadFile(filepath.Join(dir, name))
		if err != nil {
			return err
		}
		if _, err := conn.Exec(ctx, string(sqlBytes)); err != nil {
			return fmt.Errorf("%s: %w", name, err)
		}
		if _, err := conn.Exec(ctx,
			`INSERT INTO schema_migrations (version) VALUES ($1)`,
			version,
		); err != nil {
			return err
		}
	}
	return nil
}
