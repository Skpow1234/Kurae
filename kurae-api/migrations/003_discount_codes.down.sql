ALTER TABLE orders DROP COLUMN IF EXISTS discount_code_snapshot;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_code_id;
ALTER TABLE orders DROP COLUMN IF EXISTS discount_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS subtotal_cents;

DROP TABLE IF EXISTS discount_codes;
