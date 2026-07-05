ALTER TABLE drops ADD COLUMN inventory_alert_5_notified_at TIMESTAMPTZ NULL;
ALTER TABLE drops ADD COLUMN inventory_alert_20_notified_at TIMESTAMPTZ NULL;

CREATE INDEX idx_drops_inventory_alert_check
    ON drops (publish_status, ends_at)
    WHERE publish_status = 'published';
