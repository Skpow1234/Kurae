ALTER TABLE webhook_events
    ADD COLUMN order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

CREATE INDEX idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
