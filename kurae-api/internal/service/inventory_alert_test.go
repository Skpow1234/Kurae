package service

import (
	"context"
	"testing"

	"github.com/kurae/kurae-api/internal/domain"
	"github.com/kurae/kurae-api/internal/store"
)

func TestInventoryAlertServiceCheckDropSkipsDraft(t *testing.T) {
	svc := &InventoryAlertService{}
	if err := svc.CheckDrop(context.Background(), "drop-id"); err != nil {
		t.Fatalf("expected nil queue to no-op, got %v", err)
	}
}

func TestInventoryThresholdMatchesStore(t *testing.T) {
	if store.InventoryThreshold20Percent(100) != 20 {
		t.Fatal("expected aligned 20% threshold")
	}
}

func TestInventoryAlertLevels(t *testing.T) {
	if inventoryAlertLevel5 != "5" || inventoryAlertLevel20 != "20" {
		t.Fatal("unexpected alert level constants")
	}
	_ = domain.PublishPublished
}
