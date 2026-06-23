.PHONY: dev deps migrate-up migrate-down test build run-api run-worker seed deps-up deps-restart deps-down

ifneq (,$(wildcard ./.env))
include .env
export
endif

deps:
	go mod tidy

deps-up:
	docker compose up -d

deps-restart:
	docker compose restart

deps-down:
	docker compose down

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down

seed:
	go run ./cmd/seed

test:
	go test ./...

build:
	go build -o bin/api ./cmd/api
	go build -o bin/worker ./cmd/worker

run-api:
	go run ./cmd/api

run-worker:
	go run ./cmd/worker

# Swagger UI: http://localhost:8080/swagger/ (spec at /openapi.yaml)
dev: deps migrate-up run-api
