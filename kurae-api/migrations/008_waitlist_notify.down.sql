DROP INDEX IF EXISTS idx_drops_waitlist_live_notify;
ALTER TABLE drops DROP COLUMN IF EXISTS waitlist_live_notified_at;
