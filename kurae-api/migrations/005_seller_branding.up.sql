ALTER TABLE sellers ADD COLUMN brand_logo_url TEXT NOT NULL DEFAULT '';
ALTER TABLE sellers ADD COLUMN brand_accent TEXT NOT NULL DEFAULT 'blush'
    CHECK (brand_accent IN ('blush', 'dusk', 'teal'));
ALTER TABLE sellers ADD COLUMN brand_bio TEXT NOT NULL DEFAULT '';
