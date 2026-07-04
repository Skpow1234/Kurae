DROP INDEX IF EXISTS idx_buyer_referral_rewards_buyer;
DROP TABLE IF EXISTS buyer_referral_rewards;
DROP TABLE IF EXISTS buyer_referral_progress;
DROP INDEX IF EXISTS idx_referral_codes_seller_buyer;

ALTER TABLE referral_codes DROP COLUMN IF EXISTS buyer_id;

ALTER TABLE sellers
    DROP COLUMN IF EXISTS referral_rewards_enabled,
    DROP COLUMN IF EXISTS referral_reward_threshold,
    DROP COLUMN IF EXISTS referral_reward_type,
    DROP COLUMN IF EXISTS referral_reward_value;
