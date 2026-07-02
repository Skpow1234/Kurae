ALTER TABLE drops DROP CONSTRAINT drops_publish_status_check;
ALTER TABLE drops ADD CONSTRAINT drops_publish_status_check
    CHECK (publish_status IN ('draft', 'scheduled', 'published'));

CREATE INDEX idx_drops_scheduled_starts_at
    ON drops (starts_at)
    WHERE publish_status = 'scheduled';
