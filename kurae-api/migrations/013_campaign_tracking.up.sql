CREATE TABLE campaign_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    drop_id UUID REFERENCES drops(id) ON DELETE CASCADE,
    utm_source TEXT NOT NULL DEFAULT '',
    utm_medium TEXT NOT NULL DEFAULT '',
    utm_campaign TEXT NOT NULL DEFAULT '',
    utm_term TEXT NOT NULL DEFAULT '',
    utm_content TEXT NOT NULL DEFAULT '',
    touched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_touchpoints_seller_touched
    ON campaign_touchpoints (seller_id, touched_at DESC);

CREATE INDEX idx_campaign_touchpoints_drop_touched
    ON campaign_touchpoints (drop_id, touched_at DESC)
    WHERE drop_id IS NOT NULL;

ALTER TABLE orders ADD COLUMN utm_source TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN utm_medium TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN utm_campaign TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN utm_term TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN utm_content TEXT NOT NULL DEFAULT '';
