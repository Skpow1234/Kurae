package domain

type SellerBranding struct {
	LogoURL string `json:"logoUrl"`
	Accent  string `json:"accent"`
	Bio     string `json:"bio"`
}

const (
	BrandAccentBlush = "blush"
	BrandAccentDusk  = "dusk"
	BrandAccentTeal  = "teal"
)
