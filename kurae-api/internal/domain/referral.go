package domain

type ReferralCode struct {
	ID           string  `json:"id"`
	Code         string  `json:"code"`
	DropID       *string `json:"dropId,omitempty"`
	DropTitle    *string `json:"dropTitle,omitempty"`
	DropSlug     *string `json:"dropSlug,omitempty"`
	ClicksCount  int     `json:"clicksCount"`
	SignupsCount int     `json:"signupsCount"`
	OrdersCount  int     `json:"ordersCount"`
	CreatedAt    string  `json:"createdAt"`
}
