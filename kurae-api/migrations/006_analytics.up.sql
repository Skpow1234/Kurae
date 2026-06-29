CREATE TABLE drop_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drop_page_views_seller_viewed ON drop_page_views(seller_id, viewed_at);
CREATE INDEX idx_drop_page_views_drop_viewed ON drop_page_views(drop_id, viewed_at);
