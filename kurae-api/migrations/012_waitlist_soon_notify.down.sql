DROP INDEX IF EXISTS idx_drops_waitlist_soon_notify;
ALTER TABLE drops DROP COLUMN IF EXISTS waitlist_soon_notified_at;
