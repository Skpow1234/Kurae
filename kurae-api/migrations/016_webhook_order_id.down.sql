DROP INDEX IF EXISTS idx_webhook_events_created_at;
DROP INDEX IF EXISTS idx_webhook_events_order_id;
ALTER TABLE webhook_events DROP COLUMN IF EXISTS order_id;
