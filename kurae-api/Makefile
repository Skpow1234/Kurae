.PHONY: dev deps migrate-up migrate-down test build run-api run-worker seed \
	deps-up deps-restart deps-down docker-up docker-down docker-restart-api \
	docker-restart-worker docker-logs docker-seed stripe-block-a

ifneq (,$(wildcard ./.env))
include .env
export
endif

deps:
	go mod tidy

deps-up:
	docker compose up -d postgres redis

deps-restart:
	docker compose restart postgres redis

deps-down:
	docker compose down

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-restart-api:
	docker compose up -d --build api

docker-restart-worker:
	docker compose up -d --build worker

docker-logs:
	docker compose logs -f api worker

docker-seed:
	docker compose run --rm api seed

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

seed:
	go run ./cmd/seed

test:
	go test ./...

stripe-block-a:
	go test ./internal/e2e/ -run TestStripeBlockA -v -count=1

build:
	go build -o bin/api ./cmd/api
	go build -o bin/worker ./cmd/worker

run-api:
	go run ./cmd/api

run-worker:
	go run ./cmd/worker

# Local Go dev (Postgres/Redis in Docker): make deps-up && make migrate-up && make run-api
dev: deps-up migrate-up run-api
