package domain

type DiscountType string

const (
	DiscountPercent DiscountType = "percent"
	DiscountFixed   DiscountType = "fixed"
)

type DiscountCode struct {
	ID        string       `json:"id"`
	Code      string       `json:"code"`
	Type      DiscountType `json:"type"`
	Value     int          `json:"value"`
	MaxUses   *int         `json:"maxUses,omitempty"`
	UsesCount int          `json:"usesCount"`
	ExpiresAt *string      `json:"expiresAt,omitempty"`
	DropID    *string      `json:"dropId,omitempty"`
	DropTitle *string      `json:"dropTitle,omitempty"`
	Active    bool         `json:"active"`
	CreatedAt string       `json:"createdAt"`
}

type DiscountPreview struct {
	Valid         bool   `json:"valid"`
	Code          string `json:"code,omitempty"`
	DiscountCents int    `json:"discountCents"`
	SubtotalCents int    `json:"subtotalCents"`
	FinalCents    int    `json:"finalCents"`
	Currency      string `json:"currency"`
	Message       string `json:"message,omitempty"`
}
