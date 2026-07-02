ALTER TABLE drops ADD COLUMN waitlist_live_notified_at TIMESTAMPTZ NULL;

CREATE INDEX idx_drops_waitlist_live_notify
    ON drops (starts_at)
    WHERE publish_status = 'published'
      AND waitlist_live_notified_at IS NULL
      AND waitlist_count > 0;
