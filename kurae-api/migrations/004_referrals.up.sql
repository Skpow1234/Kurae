CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    drop_id UUID REFERENCES drops(id) ON DELETE SET NULL,
    clicks_count INT NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
    signups_count INT NOT NULL DEFAULT 0 CHECK (signups_count >= 0),
    orders_count INT NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (seller_id, code)
);

CREATE INDEX idx_referral_codes_seller_id ON referral_codes(seller_id);

ALTER TABLE orders ADD COLUMN referral_code_id UUID REFERENCES referral_codes(id);
ALTER TABLE orders ADD COLUMN referral_code_snapshot TEXT;

CREATE INDEX idx_orders_referral_code_id ON orders(referral_code_id);
