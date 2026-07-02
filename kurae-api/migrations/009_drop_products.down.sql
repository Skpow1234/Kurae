ALTER TABLE inventory_reservations DROP COLUMN IF EXISTS product_id;
ALTER TABLE orders DROP COLUMN IF EXISTS product_name_snapshot;
ALTER TABLE orders DROP COLUMN IF EXISTS product_id;
DROP TABLE IF EXISTS drop_products;
