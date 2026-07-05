ALTER TABLE drops ADD COLUMN waitlist_soon_notified_at TIMESTAMPTZ NULL;

CREATE INDEX idx_drops_waitlist_soon_notify
    ON drops (starts_at)
    WHERE publish_status IN ('published', 'scheduled')
      AND waitlist_soon_notified_at IS NULL
      AND waitlist_count > 0;
