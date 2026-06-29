CREATE TABLE discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value INT NOT NULL CHECK (value > 0),
    max_uses INT CHECK (max_uses IS NULL OR max_uses > 0),
    uses_count INT NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    expires_at TIMESTAMPTZ,
    drop_id UUID REFERENCES drops(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (seller_id, code)
);

CREATE INDEX idx_discount_codes_seller_id ON discount_codes(seller_id);

ALTER TABLE orders ADD COLUMN subtotal_cents INT;
ALTER TABLE orders ADD COLUMN discount_cents INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN discount_code_id UUID REFERENCES discount_codes(id);
ALTER TABLE orders ADD COLUMN discount_code_snapshot TEXT;

UPDATE orders SET subtotal_cents = amount_cents WHERE subtotal_cents IS NULL;
ALTER TABLE orders ALTER COLUMN subtotal_cents SET NOT NULL;
