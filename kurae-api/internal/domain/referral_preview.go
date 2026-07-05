package domain

type ReferralPreview struct {
	Valid         bool   `json:"valid"`
	Code          string `json:"code,omitempty"`
	ReferrerLabel string `json:"referrerLabel,omitempty"`
	SellerName    string `json:"sellerName,omitempty"`
	SellerSlug    string `json:"sellerSlug,omitempty"`
	DropTitle     string `json:"dropTitle,omitempty"`
	DropSlug      string `json:"dropSlug,omitempty"`
	Description   string `json:"description,omitempty"`
	HeroImageURL  string `json:"heroImageUrl,omitempty"`
	LogoURL       string `json:"logoUrl,omitempty"`
	Accent        string `json:"accent,omitempty"`
}
