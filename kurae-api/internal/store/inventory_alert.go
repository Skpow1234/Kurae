package store

import "context"

func InventoryThreshold20Percent(total int) int {
	if total <= 0 {
		return 0
	}
	return (total*20 + 99) / 100
}

func (r *DropRepository) ResetInventoryAlertFlags(ctx context.Context, dropID string, remaining, total int) error {
	threshold20 := InventoryThreshold20Percent(total)
	_, err := r.store.pool.Exec(ctx, `
		UPDATE drops SET
			inventory_alert_5_notified_at = CASE
				WHEN $2 > 5 THEN NULL
				ELSE inventory_alert_5_notified_at
			END,
			inventory_alert_20_notified_at = CASE
				WHEN $2 > $3 THEN NULL
				ELSE inventory_alert_20_notified_at
			END,
			updated_at = now()
		WHERE id = $1
	`, dropID, remaining, threshold20)
	return err
}

func (r *DropRepository) ClaimInventoryAlert5(ctx context.Context, dropID string) (bool, error) {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE drops SET inventory_alert_5_notified_at = now(), updated_at = now()
		WHERE id = $1
		  AND inventory_alert_5_notified_at IS NULL
		  AND inventory_remaining <= 5
		  AND inventory_total > 5
		  AND publish_status = 'published'
		  AND ends_at > now()
	`, dropID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

func (r *DropRepository) ClaimInventoryAlert20(ctx context.Context, dropID string) (bool, error) {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE drops SET inventory_alert_20_notified_at = now(), updated_at = now()
		WHERE id = $1
		  AND inventory_alert_20_notified_at IS NULL
		  AND inventory_total > 0
		  AND inventory_remaining <= ((inventory_total * 20 + 99) / 100)
		  AND publish_status = 'published'
		  AND ends_at > now()
	`, dropID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
