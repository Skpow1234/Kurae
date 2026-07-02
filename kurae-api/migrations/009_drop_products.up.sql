CREATE TABLE drop_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id),
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    image_url TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    inventory_total INT NOT NULL CHECK (inventory_total >= 0),
    inventory_remaining INT NOT NULL CHECK (inventory_remaining >= 0),
    sizes JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (drop_id, slug)
);

CREATE INDEX idx_drop_products_drop_id ON drop_products(drop_id);

ALTER TABLE orders ADD COLUMN product_id UUID REFERENCES drop_products(id);
ALTER TABLE orders ADD COLUMN product_name_snapshot TEXT NOT NULL DEFAULT '';

ALTER TABLE inventory_reservations ADD COLUMN product_id UUID REFERENCES drop_products(id);

INSERT INTO drop_products (
    drop_id, seller_id, slug, name, description, price_cents, image_url,
    inventory_total, inventory_remaining, sizes, sort_order
)
SELECT
    d.id,
    d.seller_id,
    'default',
    d.title,
    COALESCE(d.description, ''),
    d.price_cents,
    COALESCE(d.hero_image_url, ''),
    d.inventory_total,
    d.inventory_remaining,
    d.sizes,
    0
FROM drops d;

UPDATE orders o
SET product_id = dp.id,
    product_name_snapshot = dp.name
FROM drop_products dp
WHERE dp.drop_id = o.drop_id AND dp.slug = 'default';

UPDATE inventory_reservations ir
SET product_id = dp.id
FROM orders o
JOIN drop_products dp ON dp.drop_id = o.drop_id AND dp.slug = 'default'
WHERE ir.order_id = o.id AND ir.product_id IS NULL;
