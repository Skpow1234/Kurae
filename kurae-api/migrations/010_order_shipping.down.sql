DROP INDEX IF EXISTS idx_orders_shipped_at;

ALTER TABLE orders
    DROP COLUMN IF EXISTS shipping_address,
    DROP COLUMN IF EXISTS tracking_number,
    DROP COLUMN IF EXISTS shipped_at;
