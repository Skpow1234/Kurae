ALTER TABLE sellers
    ADD COLUMN referral_rewards_enabled BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN referral_reward_threshold INT NOT NULL DEFAULT 3
        CHECK (referral_reward_threshold >= 1 AND referral_reward_threshold <= 100),
    ADD COLUMN referral_reward_type TEXT NOT NULL DEFAULT 'percent'
        CHECK (referral_reward_type IN ('percent', 'fixed')),
    ADD COLUMN referral_reward_value INT NOT NULL DEFAULT 10
        CHECK (referral_reward_value >= 1);

ALTER TABLE referral_codes
    ADD COLUMN buyer_id UUID REFERENCES buyers(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX idx_referral_codes_seller_buyer
    ON referral_codes (seller_id, buyer_id)
    WHERE buyer_id IS NOT NULL;

CREATE TABLE buyer_referral_progress (
    buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    successful_referrals INT NOT NULL DEFAULT 0 CHECK (successful_referrals >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (buyer_id, seller_id)
);

CREATE TABLE buyer_referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
    reward_tier INT NOT NULL CHECK (reward_tier >= 1),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (buyer_id, seller_id, reward_tier)
);

CREATE INDEX idx_buyer_referral_rewards_buyer ON buyer_referral_rewards (buyer_id);
