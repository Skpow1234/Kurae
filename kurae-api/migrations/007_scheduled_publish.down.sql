DROP INDEX IF EXISTS idx_drops_scheduled_starts_at;

ALTER TABLE drops DROP CONSTRAINT drops_publish_status_check;
ALTER TABLE drops ADD CONSTRAINT drops_publish_status_check
    CHECK (publish_status IN ('draft', 'published'));
