ALTER TABLE orders
    ADD COLUMN shipping_address JSONB,
    ADD COLUMN tracking_number TEXT,
    ADD COLUMN shipped_at TIMESTAMPTZ;

CREATE INDEX idx_orders_shipped_at ON orders (shipped_at) WHERE shipped_at IS NOT NULL;
