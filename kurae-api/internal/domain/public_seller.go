package domain

type PublicSeller struct {
	Slug    string `json:"slug"`
	Name    string `json:"name"`
	LogoURL string `json:"logoUrl,omitempty"`
	Accent  string `json:"accent,omitempty"`
	Bio     string `json:"bio,omitempty"`
}
