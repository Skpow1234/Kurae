DROP INDEX IF EXISTS idx_drops_inventory_alert_check;
ALTER TABLE drops DROP COLUMN IF EXISTS inventory_alert_20_notified_at;
ALTER TABLE drops DROP COLUMN IF EXISTS inventory_alert_5_notified_at;
