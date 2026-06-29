ALTER TABLE orders DROP COLUMN IF EXISTS referral_code_snapshot;
ALTER TABLE orders DROP COLUMN IF EXISTS referral_code_id;

DROP TABLE IF EXISTS referral_codes;
